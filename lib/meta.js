var datapackage = require('datapackage-json')

module.exports = Meta

function Meta(dir, ready) {
  var self = this
  if (!(this instanceof Meta)) return new Meta(dir, ready)
  if (typeof dir === 'function') {
    ready = dir
    dir = undefined
  }
  if (!ready) ready = function noop() {}
  this.reserved = ['_id', '_seq', '_rev']
  this.package = datapackage(dir)
  this.package.read(function(err, json) {
    if (err) json = {}
    self.json = json
    if (!self.json.columns) self.json.columns = []
    ready(err)
  })
}

Meta.prototype.addColumns = function(columns, cb) {
  var self = this
  if (!(columns instanceof Array)) columns = [columns]
  this.json.columns = this.json.columns.concat(columns)
  this.package.write(this.json, cb)
}

Meta.prototype.getNewColumns = function (a) {
  var b = this.json.columns
  var newColumns = []
  for (var y = 0; y < a.length; y++) {
    if (this.reserved.indexOf(a[y]) > -1) continue
    var exists = false
    for (var x = 0; x < b.length; x++) {
      if (b[x] === a[y]) {
        exists = true
        continue
      }
    }
    if (!exists && newColumns.indexOf(a[y]) === -1) {
      newColumns.push(a[y])
    }
  }
  return newColumns
}
