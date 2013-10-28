var through = require('through')
var path = require('path')
var multibuffer = require('multibuffer')
var jsonBuff = require(path.join(__dirname, 'json-buff'))

module.exports = function(store, onRow) {
  return through(write)
  
  function write(obj) {
    obj = JSON.parse(obj)
    var keys = Object.keys(obj).sort()
    var headers = store.meta.columns
    var newColumns = store.getNewColumns(keys, headers)
    if (newColumns.length) headers = headers.concat(newColumns)
    if (onRow) onRow(obj)
    var buf = jsonBuff.encode(obj, headers)
    this.queue(buf)
  }
}
