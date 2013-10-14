var multibuffer = require('multibuffer')
var bops = require('bops')

module.exports.encode = encode
module.exports.decode = decode

function encode(obj, headers) {
  var keys = headers || Object.keys(obj)
  var vals = []
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var val = obj[key]
    if (typeof val === 'object' || val instanceof Array) val = JSON.stringify(val)
    vals.push(bops.from(val))
  }
  return multibuffer.pack(vals)
}

function decode(headers, vals) {
  var buffs = multibuffer.unpack(vals)
  var obj = {}
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i]
    var buff = buffs[i]
    if (buff[0] === 91 || buff[0] === 123) { // [, {
      try {
        buff = JSON.parse(buff)
      } catch(e) {}
    }
    obj[header] = bops.is(buff) ? buff.toString() : buff
  }
  return obj
}
