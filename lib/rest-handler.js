var http = require('http')
var url = require('url')
var qs = require('querystring')
var routes = require('routes')
var concat = require('concat-stream')

module.exports = RestHandler

function RestHandler(dat) {
  if (!(this instanceof RestHandler)) return new RestHandler(dat)
  this.dat = dat
  this.createRoutes()
}

RestHandler.prototype.createRoutes = function() {
  this.router = new routes.Router()
  this.router.addRoute("/", this.hello)
  // this.router.addRoute("/_bulk", this.bulk)
  this.router.addRoute("/_package", this.package)
  this.router.addRoute("/:id", this.document)
  this.router.addRoute("*", this.notFound)
}

RestHandler.prototype.package = function(req, res) {
  this.json(res, this.dat.meta.json)
}

RestHandler.prototype.handle = function(req, res) {
  console.log(req.method, req.url)
  req.route = this.router.match(req.url)
  if (!req.route) return this.error(res, 404)
  req.route.fn.call(this, req, res)
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
  if (req.method === "POST") return this.document(req, res)
  this.json(res, {"dat": "Welcome", "version": 1})
}

RestHandler.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json) + '\n')
}

RestHandler.prototype.get = function(req, res) {
  var self = this
  this.dat.storage.get(req.route.params.id, function(err, json) {
    if (err && err.message === 'range not found') return self.error(res, 404, {error: "Not Found"})
    if (err) return self.error(res, 500, err.message)
    if (json === null) return self.error(res, 404, {error: "Not Found"})
    self.json(res, json)
  })
}

RestHandler.prototype.post = function(req, res) {
  var self = this
  req.on('error', function(err) {
    self.error(res, 500, err)
  })
  req.pipe(concat(function(buff) {
    var json
    if (buff) {
      try {
        json = JSON.parse(buff)
      } catch(err) {
        return self.error(res, 500, err)
      }
    }
    if (!json) return self.error(res, 500, 'no data uploaded')
    self.dat.storage.put(json, function(err, stored) {
      if (err) {
        // if (err.conflict) return self.error(res, 409, {error: "Document update conflict. Invalid _rev"})
        return self.error(res, 500, err)
      }
      self.json(res, stored)
    })
  }))
}

RestHandler.prototype.bulk = function(req, res) {
  var self = this
  this.plumbdb.bulk(req, function(err, results) {
    if (err) return self.error(res, 500, err)
    self.json(res, {"results": results})
  })
}


RestHandler.prototype.document = function(req, res) {
  var self = this
  if (req.method === "GET") return this.get(req, res)
  if (req.method === "POST") return this.post(req, res)
}