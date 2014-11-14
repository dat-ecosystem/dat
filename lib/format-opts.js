var negotiator = require('negotiator')
var qs = require('querystring')
var url = require('url')

module.exports = Format

function Format(formatMap, defaultOpts) {
  if(!(this instanceof Format)) return new Format(formatMap, defaultOpts)
  this.formats = formatMap
  this.defaultOpts = defaultOpts || {}
  
  return this.handle.bind(this)
}

Format.prototype.handle = function (req, res, cb) {
  var opts = {}
  if(req.method === 'GET' || req.method === 'HEAD') {
      opts = qs.parse(url.parse(req.url).query)
      opts.format || this.defaultOpts.format
      var mimetype
  }
  if(opts.format) {
    mimetype = this.getMimeType(opts.format)
  } else {
    mimetype = this.mimetypeFromAccept(req)
    opts.format = this.getFormat(mimetype)
  }
  res.setHeader('Content-Type', mimetype)
  cb(req, res, opts)
}

Format.prototype.mimetypeFromAccept = function(req) {
  var formats = this.formats
  var mimes = Object.keys(formats).map(function (format) {
    return formats[format]
  })
  return negotiator(req).mediaType(mimes)
}

Format.prototype.getMimeType = function(format) {
  return this.formats[format]
}

Format.prototype.getFormat = function(mimetype) {
  var formats = this.formats
  return Object.keys(formats).filter(function (format) {
    return formats[format] === mimetype
  }).pop()
}
