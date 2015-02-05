var noop = function() {}

var encode = JSON.stringify
var decode = JSON.parse

var Dataset = function (dat, name) {
  if (!(this instanceof Dataset)) return new Dataset(dat, name)

  this.dat = dat
  this.name = name
}

Dataset.prototype.get = function (key, cb) { // TODO: use a view to not scan feed
  var self = this

  this.dat.open(function (err, dat) {
    if (err) return cb(err)

    var latest = null

    dat.log.createChangesStream()
      .on('data', function (data) {
        data.value = decode(data.value)
        if (data.value.key !== key || data.value.dataset !== self.name) return
        latest = data
      })
      .on('end', function () {
        cb(null, latest && {
          type: 'row',
          dataset: self.name,
          version: latest.hash,
          key: latest.value.key,
          value: latest.value.value
        })
      })
  })
}

Dataset.prototype.put = function (key, value, opts, cb) {
  if (typeof opts === 'function') return this.put(key, value, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  var self = this

  this.dat.open(function (err, dat) {
    if (err) return cb(err)

    dat.log.heads(function (err, heads) { // for now just override all heads
      if (err) return cb(err)
      dat.log.add(heads, encode({
        key: key,
        value: value,
        dataset: self.name
      }), function (err, node) {
        if (err) return cb(err)
        cb(null, {
          type: 'row',
          dataset: self.name,
          version: node.hash,
          key: key,
          value: value
        })
      })
    })
  })
}

module.exports = Dataset
