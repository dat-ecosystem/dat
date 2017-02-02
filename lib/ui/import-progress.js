var prettyBytes = require('pretty-bytes')
var Bar = require('./bar')

module.exports = function () {
  var bar = Bar()
  var start = Date.now()
  return function (importer) {
    if (!importer || !importer.bytesImported) return ''
    var importedBytes = importer.bytesImported
    var speed = importer.bytesImported * 1000 / (Date.now() - start)
    var progress = Math.round(importedBytes * 100 / importer.countStats.bytes)
    return bar(progress) + ` ${importer.fileCount} of ${importer.countStats.files} ${importer.countStats.files === 1 ? 'file' : 'files'}` + ' (' + prettyBytes(speed) + '/s' + ')'
  }
}
