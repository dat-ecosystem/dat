var through = require('through')
var multibuffer = require('multibuffer')
var binaryCSV = require('binary-csv')

module.exports = function() {
  var csv = binaryCSV()
  return through(write)
  
  function write(buf) {
    var cells = csv.line(buf)
    for (var i = 0; i < cells.length; i++) cells[i] = csv.cell(cells[i])
    var mb = multibuffer.pack(cells)
    this.queue(mb)
  }
}
