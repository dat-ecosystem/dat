// TODO refactor me completely

var protobuf = require('protocol-buffers')
var json = require('json-protobuf-encoding')
var debug = require('debug')('dat.schema')

var noop = function() {}

var toName = function(field) {
  return field.name
}

var Schema = function(db, onReady) {
  if (!(this instanceof Schema)) return new Schema(db, onReady)

  this.db = db
  this.blobs = null
  this.messages = null
  this.proto = null
  this.fields = null

  this.names = []
  this.reserved = ['key', 'change', 'version', 'deleted']
  this.update(onReady)
}

Schema.prototype.update = function(cb) {
  var self = this
  this.db.get('schema', {valueEncoding:'utf-8', subset:'internal'}, function(err, proto) {
    if (err && !err.notFound) return cb(err)
    self.compile(proto || 'message Row {}')
    cb()
  })
}

Schema.prototype.mergeFromObject = function(obj, cb) {
  if (!cb) cb = noop

  var keys = Object.keys(obj)
  var updated = 0

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var val = obj[key]

    if (val === null || val === undefined) continue
    if (this.reserved.indexOf(key) > -1) continue

    var idx = this.names.indexOf(key)
    if (idx === -1) {
      this.names.push(key)
      this.fields.push({
        name: key,
        required: false,
        type: 'json',
        tag: this._tag()
      })
      updated++
    } else {
      // TODO: if type !== json type check
    }
  }

  if (!updated) return cb()

  this.compile(this.messages.toJSON())
  this._save(cb)
}

var mismatch = function() {
  var err = new Error('Column mismatch')
  err.type = 'columnMismatch'
  return err
}

Schema.prototype.merge = function(cols, opts, cb) {
  if (typeof opts === 'function') return this.merge(cols, null, opts)
  if (!cb) cb = noop

  var updated = 0
  var names = this.names
  var fields = this.fields

  if (opts && opts.strict) {
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i]
      var name = typeof col === 'string' ? col : col.name
      var type = col.type || 'json'

      if (i >= names.length) {
        names.push(name)
        fields.push({
          name: name,
          required: false,
          type: type,
          tag: this._tag()
        })
        updated++
      } else {
        if (type !== fields[i].type) return cb(mismatch())
        if (name !== fields[i].name) return cb(mismatch())
      }
    }
  } else {
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i]
      var name = typeof col === 'string' ? col : col.name
      var type = col.type || 'json'
      var idx = names.indexOf(name)

      if (idx === -1) {
        names.push(name)
        fields.push({
          name: name,
          type: type,
          required: false,
          tag: this._tag()
        })
        updated++
      } else {
        if (type !== fields[i].type) return cb(mismatch())
      }
    }
  }

  if (!updated) return cb()

  this.compile()
  this._save(cb)
}

Schema.prototype.compile = function(proto) {
  if (!proto) proto = this.messages.toJSON()
  if (typeof proto === 'string' && proto[0] === '{') proto = JSON.parse(proto)

  var self = this

  var opts = {
    encodings: {
      json: json()
    }
  }

  this.names = []
  this.proto = proto
  this.messages = protobuf(proto, opts)

  this.fields = this.messages.toJSON().messages[0].fields
  this.fields.forEach(function(m) {
    if (m.name === 'blobs') self.blobs = protobuf('message Row { optional '+m.type+' blobs = '+m.tag+'; }', opts).Row
    self.names.push(m.name)
  })

  debug('compiling schema (%d fields)', this.fields.length)
}

Schema.prototype.encode = function(data) {
  var buf = this.messages.Row.encode(data)
  if (buf.length === 0) return new Buffer([0])
  return buf
}

Schema.prototype.decode = function(buf, opts) {
  if (!opts) opts = {}
  if (opts.blobsOnly) return this.blobs && this.blobs.decode(buf)

  // TODO: generate this proto instead of monkey patching
  var msg = this.messages.Row.decode(buf)
  msg.key = opts.key
  msg.version = opts.version
  return msg
}

Schema.prototype.headers = function() {
  return this.messages.toJSON().messages[0].fields.map(toName)
}

Schema.prototype.toString = function() {
  return this.messages.toString()
}

Schema.prototype.toJSON = function() {
  return this.messages.toJSON()
}

Schema.prototype._save = function(cb) {
  var self = this
  this.db.get('schema', {valueEncoding:'utf-8', subset:'internal'}, function(err, schema, version) {
    if (err && !err.notFound) return cb(err)
    self.db.put('schema', JSON.stringify(self.messages.toJSON()), {subset:'internal', version:version}, cb)
  })
}

Schema.prototype._tag = function() {
  var toTag = function(m) {
    return m.tag
  }

  var max = function(max, tag) {
    return max > tag ? max : tag
  }

  return 1 + this.fields.map(toTag).reduce(max, 0)
}

module.exports = Schema