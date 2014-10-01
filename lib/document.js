var crypto = require('crypto')
var extend = require('extend')
var lexint = require('lexicographic-integer')
var cuid = require('cuid')
var isNumber = require('isnumber')
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
module.exports.extractPrimaryKey = extractPrimaryKey

function updateVersion(doc, rowBuffer, columns) {
  var key = doc.key
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
  if (!isNumber(val)) throw new Error('cannot pack non-number')
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
    err.error = true
    err.type = 'columnMismatch'
    return err
  }

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
  if (parts[4]) obj.deleted = true
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

function extractPrimaryKey(row, opts) {
  var primary = [].concat(opts.primary || 'key')
  var format = opts.primaryFormat
  var separator = opts.separator || ''
  var key = ''

  for (var i = 0; i < primary.length; i++) {
    var pri = primary[i]
    var priKey = row[pri]

    if (format) priKey = format(priKey)
    if (!priKey && pri === 'key') priKey = cuid()
    if (key) key += separator

    key += priKey
  }

  if (opts.hash) return crypto.createHash('md5').update(key).digest("hex")
  return key
}
