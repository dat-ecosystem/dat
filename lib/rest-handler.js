var http = require('http')
var url = require('url')
var path = require('path')
var Router = require("routes-router")
var concat = require('concat-stream')
var ldj = require('ldjson-stream')
var manifest = require('level-manifest')
var multilevel = require('multilevel/msgpack')
var extend = require('extend')
var prettyBytes = require('pretty-bytes')
var jsonStream = require('JSONStream')
var replicator = require('dat-replicator')
var prebuiltEditor = require('dat-editor/prebuilt')
var debug = require('debug')('rest-handler')
var auth = require('./auth.js')

module.exports = RestHandler

function RestHandler(dat) {
  if (!(this instanceof RestHandler)) return new RestHandler(dat)
  this.dat = dat
  this.auth = auth(dat.opts)
  this.router = this.createRoutes()
  this.replicator = replicator(dat)
}

RestHandler.prototype.createRoutes = function() {
  var router = Router()
  router.addRoute("/", this.dataTable.bind(this))
  router.addRoute("/api/session", this.session.bind(this))
  router.addRoute("/api/login", this.login.bind(this))
  router.addRoute("/api/logout", this.logout.bind(this))
  router.addRoute("/api/changes", this.changes.bind(this))
  router.addRoute("/api/bulk", this.bulk.bind(this))
  router.addRoute("/api/metadata", this.package.bind(this))
  router.addRoute("/api/manifest", this.manifest.bind(this))
  router.addRoute("/api/rpc", this.rpc.bind(this))
  router.addRoute("/api/csv", this.exportCsv.bind(this))
  router.addRoute("/api/json", this.exportJson.bind(this))
  router.addRoute('/api/replicator/receive', this.replicateReceive.bind(this))
  router.addRoute('/api/replicator/send', this.replicateSend.bind(this))
  router.addRoute("/api", this.document.bind(this))
  router.addRoute("/api/:key", this.document.bind(this))
  router.addRoute("/api/:key/:filename", this.blob.bind(this))
  router.addRoute("*", this.notFound.bind(this))
  return router
}

RestHandler.prototype.session = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err, session) {
    debug('session', [err, session])
    var data = {}
    if (err) return self.auth.error(req, res)
    if (session) data.session = session
    else data.loggedOut = true
    self.json(res, data)
  })
}

RestHandler.prototype.login = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err, session) {
    debug('login', [err, session])
    if (err) {
      res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
      self.auth.error(req, res)
      return
    }
    self.json(res, {session: session})
  })
}

RestHandler.prototype.logout = function(req, res) {
  return this.auth.error(req, res)
}

RestHandler.prototype.replicateReceive = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
    req.pipe(self.replicator.receive()).pipe(res)
  })
}

RestHandler.prototype.replicateSend = function(req, res) {
  req.pipe(this.replicator.send()).pipe(res)
}

RestHandler.prototype.blob = function(req, res, opts) {
  var self = this
  if (req.method === 'GET') {
    var key = opts.key
    var blob = self.dat.createBlobReadStream(opts.key, opts.filename, opts)
    blob.on('error', function(err) {
      return self.error(res, 404, {"error": "Not Found"})
    })
    blob.pipe(res)
    return
  }
  
  if (req.method === "POST") {
    var reqUrl = url.parse(req.url, true)
    var qs = reqUrl.query
    var doc = {
      key: opts.key,
      version: qs.version
    }
    self.auth.handle(req, res, function(err) {
      if (err) return self.auth.error(req, res)
      var key = doc.key
      self.dat.get(key, { version: doc.version }, function(err, existing) {
        if (existing) {
          doc = existing
        }
        var ws = self.dat.createBlobWriteStream(opts.filename, doc, function(err, updated) {
          if (err) return self.error(res, 500, err)
          self.json(res, updated)
        })
        req.pipe(ws)
        
      })
      return
    })
    return
  }
  
  self.error(res, 405, {error: 'method not supported'})
}

RestHandler.prototype.changes = function(req, res) {
  return this.dat.sleep.httpHandler(req, res)
}

RestHandler.prototype.package = function(req, res) {
  var meta = extend({}, this.dat.meta.json, {liveBackup: this.dat.supportsLiveBackup()})
  meta.columns = this.dat.schema.toJSON()
  this.json(res, meta)
}

RestHandler.prototype.manifest = function(req, res) {
  this.json(res, manifest(this.dat.db))
}

RestHandler.prototype.rpc = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
    var mserver = multilevel.server(self.dat.db)
    req.pipe(mserver).pipe(res)
  })
}

RestHandler.prototype.exportCsv = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  qs.csv = true
  var readStream = this.dat.createValueStream(qs)
  res.writeHead(200, {'content-type': 'text/csv'})
  readStream.pipe(res)
}

RestHandler.prototype.exportJson = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  if (typeof qs.limit === 'undefined') qs.limit = 50
  var readStream = this.dat.createValueStream(qs)
  res.writeHead(200, {'content-type': 'application/json'})
  readStream.pipe(jsonStream.stringify('{"rows": [\n', '\n,\n', '\n]}\n')).pipe(res)
}

RestHandler.prototype.handle = function(req, res) {
  debug(req.connection.remoteAddress + ' - ' + req.method + ' - ' + req.url + ' - ')
  this.router(req, res)
}

RestHandler.prototype.error = function(res, status, message) {
  if (!status) status = res.statusCode
  if (message) {
    if (message.status) status = message.status
    if (typeof message === "object") message.status = status
    if (typeof message === "string") message = {error: status, message: message}
  }
  res.statusCode = status || 500
  this.json(res, message)
}

RestHandler.prototype.notFound = function(req, res) {
  this.error(res, 404, {"error": "Not Found"})
}

RestHandler.prototype.hello = function(req, res) {
  var self = this
  
  var stats = {
    "dat": "Hello",
    "version": this.dat.version,
    "changes": this.dat.storage.change,
    "name": this.dat.package.name
  }

  var rowCount = this.dat.meta.rowCount
  if (rowCount) stats.rows = rowCount
  
  // grab approximate size from db
  var start = this.dat.storage.sep
  var end = this.dat.storage.sep + this.dat.storage.sep
  // all possible keys in dat are between start and end
  this.dat.db.approximateSize(start, end, function(err, size) {
    if (err) return self.json(res, stats)
    stats.approximateSize = { rows: prettyBytes(size) }
    self.json(res, stats)
  })
}

RestHandler.prototype.dataTable = function(req, res) {
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(prebuiltEditor)
}

RestHandler.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json) + '\n')
}

RestHandler.prototype.get = function(req, res, opts) {
  var self = this
  this.dat.get(opts.key, url.parse(req.url, true).query || {}, function(err, json) {
    if (err && err.message === 'range not found') return self.error(res, 404, {error: "Not Found"})
    if (err) return self.error(res, 500, err.message)
    if (json === null) return self.error(res, 404, {error: "Not Found"})
    self.json(res, json)
  })
}

RestHandler.prototype.post = function(req, res) {
  var self = this
  self.bufferJSON(req, function(err, json) {
    if (err) return self.error(res, 500, err)
    if (!json) json = {}
    self.dat.put(json, function(err, stored) {
      if (err) {
        if (err.conflict) return self.error(res, 409, {conflict: true, error: "Document update conflict. Invalid version"})
        return self.error(res, 500, err)
      }
      res.statusCode = 201
      self.json(res, stored)
    })
  })
}

RestHandler.prototype.delete = function(req, res, opts) {
  var self = this
  self.dat.delete(opts.key, function(err, stored) {
    if (err) return self.error(res, 500, err)
    self.json(res, {deleted: true})
  })
}

RestHandler.prototype.bulk = function(req, res) {
  var self = this
  var opts = {}
  var ct = req.headers['content-type']
  
  if (ct === 'application/json') opts.json = true
  else if (ct === 'text/csv') opts.csv = true
  else return self.error(res, 400, {error: 'missing or unsupported content-type'})
  
  opts.results = true
  
  debug('/api/bulk', opts)
  
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
    var writeStream = self.dat.createWriteStream(opts)
    writeStream.on('error', function(writeErr) {
      var errObj = {
        type: 'writeStreamError',
        message: writeErr.message
      }
      res.statusCode = 400
      serializer.write(errObj)
      serializer.end()
    })
    var serializer = ldj.serialize()
    req.pipe(writeStream).pipe(serializer).pipe(res)
  })
}

RestHandler.prototype.document = function(req, res, opts) {
  var self = this
  if (req.method === "GET") {
    if (!opts.key) return self.hello(req, res)
    return this.get(req, res, opts)
  }
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
    if (req.method === "POST") return self.post(req, res, opts)
    if (req.method === "DELETE") return self.delete(req, res, opts)
    self.error(res, 405, {error: 'method not supported'})
  })
}

RestHandler.prototype.bufferJSON = function(req, cb) {
  var self = this
  req.on('error', function(err) {
    cb(err)
  })
  req.pipe(concat(function(buff) {
    var json
    if (buff && buff.length === 0) return cb()
    if (buff) {
      try {
        json = JSON.parse(buff)
      } catch(err) {
        return cb(err)
      }
    }
    if (!json) return cb(err)
    cb(null, json)
  }))
}
