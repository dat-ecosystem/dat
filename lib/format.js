var negotiator = require('negotiator')
var qs = require('querystring')
var url = require('url')

module.exports = Format

function Format(formatMap, defaultOpts) {
  if(!(this instanceof Format)) return new Format(formatMap, defaultOpts)
  this.formats = formatMap
  this.defaultOpts = defaultOpts || {}
}

Format.prototype.handle = function (source, req, res) {
  defaultOpts = this.defaultOpts
  if(req.method === 'GET' || req.method === 'HEAD') {
      var opts = qs.parse(url.parse(req.url).query)
      var format = opts.format || defaultOpts.format
      var mimetype
      if(format) {
        mimetype = this.getMimeType(format)
      } else {
        mimetype = this.mimetypeFromAccept(req)
        format = this.getFormat(mimetype)
      }
      res.setHeader('Content-Type', mimetype)
      source(opts).pipe(res)
  }
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
  Object.keys(formats).filter(function (format) {
    return formats[format] === mimetype
  }).pop()
}
