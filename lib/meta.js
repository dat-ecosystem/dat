var path = require('path')
var fs = require('fs')
var concat = require('concat-stream')
var extend = require('extend')

module.exports = Meta

function Meta(dat, ready) {
  var self = this
  if (!(this instanceof Meta)) return new Meta(dat, ready)
  if (!ready) ready = function noop() {}
  this.dat = dat
  this.reserved = ['_id', '_seq', '_rev', '_ver']
  this.schemas = {0: {version: 0, columns: []}}
  this.file = path.join(this.dat.dir, '.dat', 'dat.json')
  
  this.read(function(err, json) {
    if (err) json = {}
    self.json = json
    if (!self.json.columns) self.json.columns = []
    if (!self.json.schemaVersion) self.json.schemaVersion = 0
    ready(err)
  })
}

Meta.prototype.read = function(cb) {
  fs.readFile(this.file, function(err, buf) {
    if (err) return cb(err)
    cb(null, JSON.parse(buf))
  })
}

Meta.prototype.write = function(json, cb) {
  var self = this
  fs.writeFile(this.file, JSON.stringify(json, null, '  ') + '\n', function(err) {
    self.json = json
    cb(err)
  })
}

Meta.prototype.update = function(json, cb) {
  var self = this
  self.read(function(err, obj) {
    if (err) obj = {}
    var updated = extend({}, obj, json)
    self.write(updated, cb)
  })
}

Meta.prototype.currentSchema = function() {
  var self = this
  var ver = self.json.schemaVersion
  return self.schemas[ver]
}

Meta.prototype.addColumns = function(columns, cb) {
  var self = this
  if (!(columns instanceof Array)) columns = [columns]

  this.json.columns = this.json.columns.concat(columns)
  this.dat.schemas.put('schema', this.json, {valueEncoding: 'json'}, function(err, version) {
    if (err) return cb(err)
    self.schemas[version] = {
      version: version,
      columns: self.json.columns
    }
    self.update(self.json, cb)
  })
}

Meta.prototype.getNewColumns = function(a) {
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

Meta.prototype.loadAllSchemas = function(cb) {
  var self = this
  if (self.json.schemaVersion === 0) return cb()
  self.dat.schemas.createReadStream().pipe(concat(function(schemas) {
    schemas.map(function(schema) {
      self.schemas[schema.version] = {
        version: schema.version,
        columns: JSON.parse(schema.value).columns
      }
    })
    cb()
  }))
}
