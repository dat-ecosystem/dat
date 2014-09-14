var http = require('http')
var url = require('url')
var path = require('path')
var sleep = require('sleep-ref')
var Router = require("routes-router")
var concat = require('concat-stream')
var ldj = require('ldjson-stream')
var manifest = require('level-manifest')
var multilevel = require('multilevel')
var extend = require('extend')
var prettyBytes = require('pretty-bytes')
var jsonStream = require('JSONStream')
var prebuiltEditor = require('dat-editor-prebuilt')
var debug = require('debug')('rest-handler')
var auth = require('./auth.js')
var pump = require('pump')
var zlib = require('zlib')
var through = require('through2')

module.exports = RestHandler

function RestHandler(dat) {
  if (!(this instanceof RestHandler)) return new RestHandler(dat)
  this.dat = dat
  this.auth = auth(dat.options)
  this.router = this.createRoutes()
  this.sleep = sleep(function(opts) {
    opts.decode = true
    if (opts.live === 'true') opts.live = true
    if (opts.tail === 'true') opts.tail = true
    return dat.createChangesReadStream(opts)
  }, {style: 'newline'})
}

RestHandler.prototype.createRoutes = function() {
  var router = Router()
  router.addRoute("/", this.dataTable.bind(this))
  router.addRoute("/api/session", this.session.bind(this))
  router.addRoute("/api/login", this.login.bind(this))
  router.addRoute("/api/logout", this.logout.bind(this))
  router.addRoute("/api/pull", this.pull.bind(this))
  router.addRoute("/api/push", this.push.bind(this))
  router.addRoute("/api/changes", this.changes.bind(this))
  router.addRoute("/api/stats", this.stats.bind(this))
  router.addRoute("/api/bulk", this.bulk.bind(this))
  router.addRoute("/api/metadata", this.package.bind(this))
  router.addRoute("/api/manifest", this.manifest.bind(this))
  router.addRoute("/api/rpc", this.rpc.bind(this))
  router.addRoute("/api/csv", this.exportCsv.bind(this))
  router.addRoute("/api", this.hello.bind(this))
  router.addRoute("/api/rows", this.document.bind(this))
  router.addRoute("/api/rows/:key", this.document.bind(this))
  router.addRoute("/api/rows/:key/:filename", this.blob.bind(this))
  router.addRoute("/api/blobs/:key", this.blobs.bind(this))
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

RestHandler.prototype.blob = function(req, res, opts) {
  var self = this
  if (req.method === 'GET') {
    var key = opts.key
    var blob = self.dat.createBlobReadStream(opts.key, opts.filename, opts)
    blob.on('error', function(err) {
      return self.error(res, 404, {"error": "Not Found"})
    })
    pump(blob, res)
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
        pump(req, ws)
      })
      return
    })
    return
  }
  
  self.error(res, 405, {error: 'method not supported'})
}

RestHandler.prototype.blobs = function(req, res, opts) {
  var self = this
  if (req.method === 'HEAD') {
    var key = opts.key
    var blob = self.dat.blobs.backend.exists(opts, function(err, exists) {
      res.statusCode = exists ? 200 : 404
      res.setHeader('content-length', 0)
      res.end()
    })
    return
  }
  if (req.method === 'GET') {
    res.statusCode = 200
    return pump(self.dat.blobs.backend.createReadStream(opts), res)
  }
  self.error(res, 405, {error: 'method not supported'})
}

var unzip = function(req) {
  return req.headers['content-encoding'] === 'gzip' ? zlib.createGunzip() : through()
}

var zip = function(req, res) {
  if (!/gzip/.test(req.headers['accept-encoding'] || '')) return through()
  res.setHeader('Content-Encoding', 'gzip')
  return zlib.createGzip()
}

RestHandler.prototype.push = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
  
    pump(req, unzip(req), self.dat.replicator.receive(), function(err) {
      if (err) {
        res.statusCode = err.status || 500
        res.end(err.message)
        return
      }
      res.end()
    })
  })
}

RestHandler.prototype.pull = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query

  var send = this.dat.replicator.send({
    since: parseInt(qs.since, 10) || 0,
    blobs: qs.blobs !== 'false',
    live: !!qs.live
  })

  pump(send, zip(req, res), res)
}

RestHandler.prototype.changes = function(req, res) {
  this.sleep.httpHandler(req, res)
}

RestHandler.prototype.stats = function(req, res) {
  var statsStream = this.dat.createStatsStream()
  statsStream.on('error', function(err) {
    var errObj = {
      type: 'statsStreamError',
      message: err.message
    }
    res.statusCode = 400
    serializer.write(errObj)
    serializer.end()
  })
  var serializer = ldj.serialize()
  pump(statsStream, serializer, res)
}

RestHandler.prototype.package = function(req, res) {
  var meta = {changes: this.dat.storage.change, liveBackup: this.dat.supportsLiveBackup()}
  meta.columns = this.dat.schema.headers()
  this.json(res, meta)
}

RestHandler.prototype.manifest = function(req, res) {
  this.json(res, manifest(this.dat.storage))
}

RestHandler.prototype.rpc = function(req, res) {
  var self = this
  this.auth.handle(req, res, function(err) {
    if (err) return self.auth.error(req, res)
    var mserver = multilevel.server(self.dat.storage)
    pump(req, mserver, res)
  })
}

RestHandler.prototype.exportCsv = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  qs.csv = true
  var readStream = this.dat.createReadStream(qs)
  res.writeHead(200, {'content-type': 'text/csv'})
  pump(readStream, res)
}

RestHandler.prototype.exportJson = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  if (typeof qs.limit === 'undefined') qs.limit = 50
  else qs.limit = +qs.limit
  var readStream = this.dat.createReadStream(qs)
  res.writeHead(200, {'content-type': 'application/json'})
  pump(readStream, jsonStream.stringify('{"rows": [\n', '\n,\n', '\n]}\n'), res)
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
    "name": this.dat.options.name
  }

  this.dat.storage.stat(function(err, stat) {
    if (err) return self.json(res, stats)
    stats.rows = stat.rows
    self.dat.storage.approximateSize(function(err, size) {
      if (err) return self.json(res, stats)
      stats.approximateSize = { rows: prettyBytes(size) }
      self.json(res, stats)
    })
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
    pump(req, writeStream, serializer, res)
  })
}

RestHandler.prototype.document = function(req, res, opts) {
  var self = this
  if (req.method === "GET" || req.method === "HEAD") {
    if (opts.key) return this.get(req, res, opts)
    else return this.exportJson(req, res)
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
