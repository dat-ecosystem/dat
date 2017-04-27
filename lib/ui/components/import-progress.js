var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var bar = require('progress-string')
var cliTruncate = require('cli-truncate')

module.exports = importUI

function importUI (state) {
  var importer = state.importer
  if (!importer || !importer.count) return ''

  if (!importer.countFinished) return `Indexing directory: ${importer.count.files} files (${pretty(importer.count.bytes)})`
  if (importer.progress >= importer.count.bytes) return 'Archive up to date.'

  var speed = importer.indexSpeed ? `${pretty(importer.indexSpeed)}/s` : ''
  if (!importer.totalBar && importer.count.bytes) {
    var total = importer.count.bytes
    importer.totalBar = bar({
      total: total,
      width: 40,
      style: function (a, b) {
        return `[${a}${b}] ${pretty(importer.progress)} / ${pretty(total)}`
      }
    })
  }

  return output`
    Importing ${importer.count.files} files
    ${importer.totalBar ? importer.totalBar(importer.progress) : ''}
    ${speed} ${importer.fileImport ? '\n\n' + fileImport() : ''}
  `

  function fileImport () {
    if (importer.fileImport.type === 'del') return `\nDEL: ${importer.fileImport.src.name}`
    if (!importer.fileImport.bar) {
      var total = importer.fileImport.src.stat.size
      importer.fileImport.bar = bar({
        total: total,
        width: 40,
        style: function (a, b) {
          return `[${a}${b}] ${pretty(importer.fileImport.progress)} / ${pretty(total)}`
        }
      })
    }
    var name = importer.fileImport.dst.name
    return output`
      ADD: ${cliTruncate(name, process.stdout.columns - 5, {position: 'start'})}
      ${importer.fileImport.bar(importer.fileImport.progress)}
    `
  }
}
