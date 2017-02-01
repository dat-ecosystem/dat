var Bar = require('./bar')

module.exports = function () {
  var bar = Bar()
  return function (importer) {
    if (!importer || !importer.bytesImported) return ''
    var importedBytes = importer.bytesImported
    var importedFiles = importer.fileCount - 1 // Importer counts files before importing
    if (importedFiles > 1) importedFiles = importedFiles - 1 // Do not count dat.json. TODO: buggy, sometimes ends up with -1
    if (importedFiles <= 0) return '' // Show empty until action. <0 b/c of TODO bug above
    var progress = Math.round(importedBytes * 100 / importer.countStats.bytes)
    return bar(progress) + ` ${importedFiles} ${importedFiles === 1 ? 'file' : 'files'} imported`
  }
}
