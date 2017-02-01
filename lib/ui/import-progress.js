var Bar = require('./bar')

module.exports = function () {
  var bar = Bar()
  return function (importer) {
    if (!importer || !importer.bytesImported) return ''
    var importedBytes = importer.bytesImported
    var progress = Math.round(importedBytes * 100 / importer.countStats.bytes)
    return bar(progress) + ` ${importer.fileCount} ${importer.fileCount === 1 ? 'file' : 'files'} imported`
  }
}
