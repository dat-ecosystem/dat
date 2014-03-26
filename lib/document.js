var jsonBuffStream = require('json-multibuffer-stream')
var crypto = require('crypto')
var timestamp = require('monot')()
var extend = require('extend')
var lexint = require('lexicographic-integer')
var debug = require('debug')('dat.document')

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
module.exports.packRevision = packRevision

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
  }
  if (!nextHash) nextHash = hash(doc, rowBuffer, columns)
  var rev = prev + 1 + '-' + nextHash
  return extend({}, doc, {_rev: rev, _id: id})
}

function rowKeys(keys, sep, id, rev, seq, deleted) {
  var revParts = rev.split('-')
  var revNum = +revParts[0]
  var varSeq = pack(seq)
  var seqKey = key(sep, keys.seq, varSeq)
  var revString = pack(revNum) + '-' + revParts[1]
  var row = sep + keys.data + sep + id + sep + revString
  if (deleted) row += sep + '1' // deleted is boolean
  return {
    row: row,
    seq: seqKey,
    cur: key(sep, keys.cur, id)
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

function packRevision(rev) {
  var revParts = rev.split('-')
  var revNum = +revParts[0]
  var revString = pack(revNum) + '-' + revParts[1]
  return revString
}

function decodeRow(key, buff, meta) {
  var doc = decodeKey(key)

  // if row is a single whitespace return early
  if (buff.length === 1 && buff[0] === 32) return doc
  
  var value = jsonBuffStream.decode(meta.json.columns, buff)

  // if this row has more columns than us it is probably from the future
  if (value.unpacked.length > meta.json.columns.length) {
    debug('column mismatch')
    var err = {
      message: 'Row has more columns than local schema',
      type: 'columnMismatch',
      error: true
    }
    return err
  }
  
  debug('columns decoded', value.decoded)
  
  doc = extend(doc, value.decoded)
  delete doc._seq
  return doc
}

// example: ÿdÿfooÿ01-abc
function decodeKey(key) {
  var parts = key.split('ÿ')
  var revs = parts[3].split('-')
  var obj = {
    '_id': parts[2],
    '_rev': unpack(revs[0]) + '-' + revs[1]
  }
  if (parts[5]) obj._deleted = true
  return obj
}

// example: 1294,efbd8c3d,1-ae33i23inb5bsbcv
function decodeSeq(key) {
  var parts = JSON.parse(key)
  return {
    '_id': parts[1],
    '_rev': parts[2],
    '_seq': +parts[0]
  }
}
