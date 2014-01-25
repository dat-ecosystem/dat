var jsonBuffStream = require('json-multibuffer-stream')
var crypto = require('crypto')
var timestamp = require('monot')()
var extend = require('extend')
var lexint = require('lexicographic-integer')

module.exports.uuid = uuid
module.exports.hash = hash
module.exports.updateRevision = updateRevision
module.exports.rowKeys = rowKeys
module.exports.key = key
module.exports.pack = pack
module.exports.unpack = unpack
module.exports.decodeRow = decodeRow
module.exports.decodeSeq = decodeSeq
module.exports.decodeKey = decodeKey

// TODO benchmark + review various uuid options
function uuid() {
  var stamper = new timestamp()
  return stamper.toISOString() + '-' + Math.random().toString(16).slice(2)
}

function hash(doc, rowBuffer, columns) {
  if (!rowBuffer) {
    if (doc._rev) {
      var rev = doc._rev
      delete doc._rev
    }
    rowBuffer = jsonBuffStream.encode(doc, columns)
  }
  var hash = crypto.createHash('md5').update(rowBuffer).digest("hex")
  if (rev) {
    doc._rev = rev
  }
  return hash
}

function updateRevision(doc, rowBuffer, columns) {
  var id = doc._id
  if (typeof id !== 'string') id = uuid()
  var prev = 0, nextHash
  if (doc._rev) {
    var revParts = doc._rev.split('-')
    prev = +revParts[0]
    var prevHash = revParts[1]
    nextHash = hash(doc, rowBuffer, columns)
    if (prevHash === nextHash) return false // doc didnt change
  }
  if (!nextHash) nextHash = hash(doc, rowBuffer, columns)
  var rev = prev + 1 + '-' + nextHash
  return extend({}, doc, {_rev: rev, _id: id})
}

function rowKeys(keys, sep, id, rev, seq, schemaVersion) {
  var revParts = rev.split('-')
  var revNum = +revParts[0]
  var seqKey = key(sep, keys.seq, pack(seq))
  var row = key(sep, keys.data, id + key(sep, keys.rev, pack(revNum) + '-' + revParts[1]) + seqKey)
  row += sep + pack(+schemaVersion)
  return {
    row: row,
    seq: seqKey
  }
}

function key(sep, sublevel, key) {
  return sep + sublevel + sep + key
}

function pack(val) {
  if (typeof val === 'undefined') throw new Error('cannot pack undefined value')
  return lexint.pack(val, 'hex')
}

function unpack(val) {
  if (typeof val === 'undefined') throw new Error('cannot unpack undefined value')
  return lexint.unpack(val, 'hex')
}

function decodeRow(key, value, meta, cb) {
  var decoded = decodeKey(key)
  var schema = meta.schemas[decoded._ver]
  // used cached schema if it exists
  if (schema) return decode()
  // otherwise try to get the schema from the db
  meta.dat.schemas.get('schema', {version: decoded._ver, valueEncoding: 'json'}, gotSchema)
  
  function gotSchema(err, value, version) {
    if (err) return cb(err)
    meta.schemas[version] = {
      version: version,
      columns: value.columns
    }
    schema = meta.schemas[version]
    decode()
  }

  function decode() {
    value = jsonBuffStream.decode(schema.columns, value)
    var doc = extend(decoded, value)
    delete doc._seq
    delete doc._ver
    cb(null, doc)
  }
}

// example: ÿdÿffe33ee5ÿrÿfc0148ÿsÿ01
function decodeKey(key) {
  var parts = key.split('ÿ')
  var revs = parts[4].split('-')
  return {
    '_id': parts[2],
    '_rev': unpack(revs[0]) + '-' + revs[1],
    '_seq': unpack(parts[6]),
    '_ver': unpack(parts[7])
  }
}

// example: 1294,efbd8c3d,1-ae33i23inb5bsbcv
function decodeSeq(key) {
  var parts = JSON.parse(key)
  return {
    '_seq': +parts[0],
    '_id': parts[1],
    '_rev': parts[2]
  }
}
