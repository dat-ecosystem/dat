var stdout = require('stdout-stream')
var multistream = require('multistream')
var eos = require('end-of-stream')
var through = require('through2')
var ldj = require('ndjson')
var pump = require('pump')

module.exports = function(dat, opts, cb) {
  if (!opts) opts = {}
  if (!opts.f && !opts.json) opts.json = true

  var readStream = dat.createReadStream(opts)

  if (opts.live) {
    var changes = dat.createChangesReadStream({
      since: dat.storage.change,
      data: true,
      decode: true,
      live: true
    })

    var format = through.obj(function(data, enc, cb) {
      cb(null, data.value)
    })

    readStream = multistream([readStream, pump(changes, format, ldj.serialize())])
  }

  readStream.pipe(stdout)
  eos(readStream, cb)
}