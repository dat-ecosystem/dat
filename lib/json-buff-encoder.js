var through = require('through')
var path = require('path')
var multibuffer = require('multibuffer')
var jsonBuff = require(path.join(__dirname, 'json-buff'))

module.exports = function(store, onRow) {
  return through(write)
  
  function write(obj) {
    if (obj.length) obj = JSON.parse(obj)
    var keys = Object.keys(obj).sort()
    var headers = store.meta.json.columns
    var newColumns = store.meta.getNewColumns(keys)
    if (newColumns.length) headers = headers.concat(newColumns)
    if (onRow) onRow(obj)
    var buf = jsonBuff.encode(obj, headers)
    this.queue(buf)
  }
}
