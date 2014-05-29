var crypto = require('crypto')
var extend = require('extend')
var lexint = require('lexicographic-integer')
var cuid = require('cuid')
var debug = require('debug')('dat.document')

module.exports.uuid = cuid
module.exports.updateVersion = updateVersion
module.exports.rowKeys = rowKeys
module.exports.key = key
module.exports.pack = pack
module.exports.unpack = unpack
module.exports.decodeRow = decodeRow
module.exports.decodeChange = decodeChange
module.exports.decodeKey = decodeKey

function updateVersion(doc, rowBuffer, columns) {
  var key = doc.key
  if (typeof key !== 'string') key = cuid()
  var prev = 0
  if (doc.version) {
    prev = +doc.version
  }
  var ver = prev + 1
  return extend({}, doc, {version: ver, key: key})
}

function rowKeys(keys, sep, keyString, version, change, deleted) {
  var versionNum = +version
  var varChange = pack(change)
  var changeKey = key(sep, keys.change, varChange)
  var verString = pack(versionNum)
  var row = sep + keys.data + sep + keyString + sep + verString
  if (deleted) row += sep + '1' // deleted is boolean
  return {
    row: row,
    change: changeKey,
    cur: key(sep, keys.cur, keyString)
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

function decodeRow(key, buff, storage, valuesOnly) {
  var doc = decodeKey(key)

  // if row is a single whitespace return early
  if (buff.length === 1 && buff[0] === 32) return doc

  try {
    var value = storage.schema.decode(buff)
  } catch (err) {
    err.error = true;
    err.type = 'columnMismatch'
    return err
  }

  debug('columns decoded', value)
  
  doc = extend(doc, value)
  delete doc.change
  return doc
}

// example: ÿdÿfooÿ01
function decodeKey(key) {
  var parts = key.split('ÿ')
  var ver = parts[3]
  var obj = {
    'key': parts[2],
    'version': unpack(ver)
  }
  if (parts[5]) obj.deleted = true
  return obj
}

// example: 1294,efbd8c3d,1-ae33i23inb5bsbcv
function decodeChange(key) {
  var parts = JSON.parse(key)
  return {
    'key': parts[1],
    'version': parts[2],
    'change': +parts[0],
    'deleted': parts[3]
  }
}
