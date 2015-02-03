var noop = function() {}

var Dataset = function (dat, name) {
  if (!(this instanceof Dataset)) return new Dataset(dat, name)

  this.dat = dat
  this.name = name
}

Dataset.prototype.put = function (key, value, opts, cb) {
  if (typeof opts === 'function') return this.put(key, value, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  this.dat.open(function (err, dat) {
    if (err) return cb(err)
  })
}

module.exports = Dataset
