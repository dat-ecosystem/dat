var path = require('path')
var fs = require('fs')
var concat = require('concat-stream')
var extend = require('extend')
var request = require('request')
var debug = require('debug')('dat.meta')

module.exports = Meta

function Meta(dat, ready) {
  var self = this
  if (!(this instanceof Meta)) return new Meta(dat, ready)
  if (!ready) ready = function noop() {}
  this.dat = dat
  this.reserved = ['_id', '_seq', '_rev', '_deleted']
  this.file = path.join(this.dat.dir, '.dat', 'dat.json')
  
  this.read(function(err, json) {
    if (err) json = {}
    if (!json.columns) json.columns = []
    self.json = json
    ready(err)
  })
}

Meta.prototype.read = function(cb) {
  debug('read', this.file)
  fs.readFile(this.file, function(err, buf) {
    if (err) return cb(err)
    cb(null, JSON.parse(buf))
  })
}

Meta.prototype.write = function(json, cb) {
  var self = this
  debug('write', this.file)
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

Meta.prototype.addColumns = function(columns, cb) {
  var self = this
  if (!(columns instanceof Array)) columns = [columns]
  this.json.columns = this.json.columns.concat(columns)
  this.dat.db.put('config', this.json, {valueEncoding: 'json'}, function(err) {
    if (err) return cb(err)
    self.update(self.json, cb)
  })
}

Meta.prototype.getNewColumns = function(b, opts) {
  if (!opts) opts = { strict: false }
  var existing = [].concat(this.json.columns)
    
  // remove reserved columns
  var incoming = []
  for (var i = 0; i < b.length; i++) {
    if (this.reserved.indexOf(b[i]) > -1) continue
    incoming.push(b[i])
  }
  
  // return early if there aren't any existing columns
  if (existing.length === 0) return incoming
  
  existing.sort()
  incoming.sort()
  
  var newColumns = []
  
  // strict mode matches based on order. non strict matches based on indexOf
  if (opts.strict) {
    // loop over all potentially new columns
    for (var y = 0; y < incoming.length; y++) {
      var newer = incoming[y]
      var older = existing[y]
      
      if (y >= existing.length) {
        newColumns.push(newer)
      } else if (newer === older) { 
        continue
      } else {
        var err = {
          message: 'Incoming data has different schema than existing data',
          type: 'columnMismatch',
          existing: existing,
          incoming: incoming,
          error: true
        }
        return err
      }
    }
  } else {
    for (var y = 0; y < incoming.length; y++) {
      var col = incoming[y]
      if (existing.indexOf(col) === -1) newColumns.push(col)
    }
  }
  
  return newColumns
}

Meta.prototype.pullSchema = function(remote, cb) {
  var self = this
  request({ json: true, url: remote + '/_schema' }, function(err, resp, json) {
    if (err || resp.statusCode > 299) {
      return cb(err || new Error(resp.statusCode), "Remote schema request failed")
    }
    var existing = self.json.columns
    var incoming = json.columns
    
    // if they match return early
    if (JSON.stringify(existing) === JSON.stringify(incoming)) return cb(null)
    
    var conflict = false
    var newColumns = []
    var mismatch = new Error('Remote schema mismatch')
    
    if (incoming.length < existing.length) return cb(mismatch)
    if (JSON.stringify(existing) !== JSON.stringify(incoming.slice(0, existing.length))) return cb(mismatch)
    
    var newColumns = incoming.slice(existing.length)
    
    self.addColumns(newColumns, function(err) {
      if (err) return cb(err)
      cb(null)
    })
  })
}
