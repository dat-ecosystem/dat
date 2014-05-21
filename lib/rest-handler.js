var http = require('http')
var url = require('url')
var Router = require("routes-router")
var concat = require('concat-stream')
var ldj = require('ldjson-stream')
var levelBackup = require('hyperlevel-backup')
var basic = require('basic')
var manifest = require('level-manifest')
var multilevel = require('multilevel/msgpack')
var extend = require('extend')
var dataTable = require('data-table')
var prettyBytes = require('pretty-bytes')
var jsonStream = require('JSONStream')
var debug = require('debug')('rest-handler')

module.exports = RestHandler

function RestHandler(dat) {
  if (!(this instanceof RestHandler)) return new RestHandler(dat)
  this.dat = dat
  this.auth = basicAuth(dat.opts.adminUser, dat.opts.adminPass)
  this.router = this.createRoutes()
}

RestHandler.prototype.createRoutes = function() {
  var router = Router()
  router.addRoute("/", this.dataTable.bind(this))
  router.addRoute("/api/changes", this.changes.bind(this))
  router.addRoute("/api/bulk", this.bulk.bind(this))
  router.addRoute("/api/package", this.package.bind(this))
  router.addRoute("/api/manifest", this.manifest.bind(this))
  router.addRoute("/api/rpc", this.rpc.bind(this))
  router.addRoute("/api/csv", this.exportCsv.bind(this))
  router.addRoute("/api/json", this.exportJson.bind(this))
  router.addRoute("/api/archive", this.archive.bind(this))
  router.addRoute("/api", this.document.bind(this))
  router.addRoute("/api/:id", this.document.bind(this))
  router.addRoute("/api/:id/:filename", this.blob.bind(this))
  router.addRoute("*", this.notFound.bind(this))
  return router
}

RestHandler.prototype.blob = function(req, res, opts) {
  var self = this
  if (req.method === 'GET') {
    var id = opts.id
    self.dat.get(id, function(err, doc) {
      var attachment
      if (doc && doc.attachments) {
        attachment = doc.attachments[opts.filename]
      }
      if (err || !attachment) return self.error(res, 404, {"error": "Not Found"})
      self.dat.blobs.createReadStream(attachment.hash).pipe(res)
    })
    return
  }
  
  if (req.method === "POST") {
    var reqUrl = url.parse(req.url, true)
    var qs = reqUrl.query
    var doc = {
      id: opts.id,
      version: qs.version
    }
    self.auth(req, res, function(err) {
      if (err) return self.authError(req, res)
      var id = doc.id
      self.dat.get(id, { version: doc.version }, function(err, existing) {
        if (existing) {
          if (existing.attachments) existing.attachments = JSON.parse(existing.attachments)
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

RestHandler.prototype.archive = function(req, res) {
  if (!this.dat.supportsLiveBackup()) {
    this.json(res, {"error": "archive export is not available on this dat"})
    return
  }
  levelBackup(this.dat.db.db, {dir: this.dat.paths().level}, res)
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
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
    var mserver = multilevel.server(self.dat.db)
    req.pipe(mserver).pipe(res)
  })
}

RestHandler.prototype.exportCsv = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  qs.csv = true
  var readStream = this.dat.createReadStream(qs)
  res.writeHead(200, {'content-type': 'text/csv'})
  readStream.pipe(res)
}

RestHandler.prototype.exportJson = function(req, res) {
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  if (typeof qs.limit === 'undefined') qs.limit = 50
  var readStream = this.dat.createReadStream(qs)
  res.writeHead(200, {'content-type': 'application/json'})
  readStream.pipe(jsonStream.stringify('{"rows": [\n', '\n,\n', '\n]}\n')).pipe(res)
}

RestHandler.prototype.handle = function(req, res) {
  debug(req.method + ' - ' + req.url)
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

RestHandler.prototype.authError = function(req, res) {
  res.statusCode = 401
  res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
  res.end("Unauthorized\n")
}

RestHandler.prototype.notFound = function(req, res) {
  this.error(res, 404, {"error": "Not Found"})
}

RestHandler.prototype.hello = function(req, res) {
  var self = this
  
  var stats = {"dat": "Hello", "version": this.dat.version, "changes": this.dat.storage.change}
  var rowCount = this.dat.meta.rowCount
  if (rowCount) stats.rows = rowCount
  
  // grab approximate size from db
  var start = this.dat.storage.sep
  var end = this.dat.storage.sep + this.dat.storage.sep
  // all possible keys in dat are between start and end
  this.dat.db.approximateSize(start, end, function(err, size) {
    if (err) return self.json(res, stats)
    stats.approximateSize = { documents: prettyBytes(size) }
    self.json(res, stats)
  })
}

RestHandler.prototype.dataTable = function(req, res) {
  res.setHeader('content-type', 'text/html')
  var headers = this.dat.headers()
  var reqUrl = url.parse(req.url, true)
  var qs = reqUrl.query
  var readOpts = {keys: false, limit: 100}
  if (qs.limit) readOpts.limit = +qs.limit
  if (qs.start) readOpts.start = qs.start
  if (qs.end) readOpts.end = qs.end
  if (qs.reverse) readOpts.reverse = Boolean(qs.reverse)
  var table = dataTable(headers)
  this.dat.createReadStream(readOpts).pipe(table).pipe(res)
}

RestHandler.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json) + '\n')
}

RestHandler.prototype.get = function(req, res, opts) {
  var self = this
  this.dat.get(opts.id, url.parse(req.url, true).query || {}, function(err, json) {
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
        // if (err.conflict) return self.error(res, 409, {error: "Document update conflict. Invalid version"})
        return self.error(res, 500, err)
      }
      self.json(res, stored)
    })
  })
}

RestHandler.prototype.delete = function(req, res, opts) {
  var self = this
  self.dat.delete(opts.id, function(err, stored) {
    if (err) return self.error(res, 500, err)
    self.json(res, {deleted: true})
  })
}

RestHandler.prototype.bulk = function(req, res) {
  var self = this
  var opts = {}
  var ct = req.headers['content-type']
  if (ct === 'application/json') opts.json = true
  if (ct === 'text/csv') opts.csv = true
  
  opts.results = true

  debug('/api/bulk', opts)
  
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
    var writeStream = self.dat.createWriteStream(opts)
    var serializer = ldj.serialize()
    req.pipe(writeStream).pipe(serializer).pipe(res)
  })
}

RestHandler.prototype.document = function(req, res, opts) {
  var self = this
  if (req.method === "GET") {
    if (!opts.id) return self.hello(req, res)
    return this.get(req, res, opts)
  }
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
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

function basicAuth(adminu, adminp) {
  var adminu = adminu || process.env["DAT_ADMIN_USER"]
  var adminp = adminp || process.env["DAT_ADMIN_PASS"]
  if (!adminu || !adminp) return function noAuth(req, res, cb) { cb(null) }
  
  return basic(function (user, pass, callback) {
    if (user === adminu && pass === adminp) return callback(null)
    callback(new Error("Access Denied"))
  })
}
