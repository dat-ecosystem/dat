var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var bar = require('progress-string')
var cliTruncate = require('cli-truncate')

module.exports = importUI

function importUI (state) {
  var watch = state.opts.watch
  var state = state.importer
  var indexSpeed = state.indexSpeed ? `(${pretty(state.indexSpeed)}/s)` : ''

  if (state.count && !state.count.done) {
    // dry run in progress
    if (!state.count.files) return 'Checking for file updates...'
    return output`
      Imported ${state.putDone.files} of ${state.count.files} files ${indexSpeed}
      (Calculating files to import...)
      ${fileImport(state.fileImport)}
    `
  } else if (state.putDone.files >= state.count.files) {
    // Initial import done
    if (!watch) return 'All files imported.'
    return liveImport()
  }

  var total = state.count.bytes
  var totalBar = bar({
    total: total,
    style: function (a, b) {
      return `[${a}${b}] ${(100 * state.importedBytes / total).toFixed(0)}%`
    }
  })

  return output`
    Importing ${state.count.files} files to Archive ${indexSpeed}
    ${totalBar(state.importedBytes)}
    ${fileImport(state.fileImport)}
  `

  function liveImport () {
    // Live import
    var imports = state.liveImports.slice(1).slice(-7)
    return output`
      Watching for file updates
      ${imports.map(function (file) {
        return fileImport(file)
      }).join('')}
    `
  }

  function fileImport (file) {
    if (!file) return ''
    if (file.type === 'del') return `DEL: ${file.src.name}`

    var total = file.src.stat.size
    var name = file.dst.name.substr(1) // remove '/' at start
    var size

    // >500 mb show progress
    if (total < 5e8 || !file.progress) size = `(${pretty(total)})`
    else size = `(${pretty(file.progress)} / ${pretty(total)})`
    return output`
      ADD: ${cliTruncate(name, process.stdout.columns - 7 - size.length, {position: 'start'})} ${size}
    `
  }
}
