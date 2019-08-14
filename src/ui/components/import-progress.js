const output = require('neat-log/output')
const pretty = require('prettier-bytes')
const bar = require('progress-string')
const cliTruncate = require('cli-truncate')

module.exports = importUI

function importUI (state) {
  const watch = state.opts.watch
  const importState = state.importer
  const indexSpeed = importState.indexSpeed ? `(${pretty(importState.indexSpeed)}/s)` : ''

  if (importState.count && !importState.count.done) {
    // dry run in progress
    if (!importState.count.files) return 'Checking for file updates...'
    return output(`
      Metadata created for ${importState.putDone.files} of ${importState.count.files} files ${indexSpeed}
      (Calculating file count...)
      ${fileImport(importState.fileImport)}
    `)
  } else if (importState.putDone.files >= importState.count.files) {
    // Initial import done
    if (!watch) return 'Archive metadata updated for all files.'
    return liveImport()
  }

  const total = importState.count.bytes
  const totalBar = bar({
    total: total,
    style: function (a, b) {
      return `[${a}${b}] ${(100 * importState.importedBytes / total).toFixed(0)}%`
    }
  })

  return output(`
    Creating metadata for ${importState.count.files} files ${indexSpeed}
    ${totalBar(importState.importedBytes)}
    ${fileImport(importState.fileImport)}
  `)

  function liveImport () {
    // Live import
    const imports = importState.liveImports.slice(1).slice(-7)
    return output(`
      Watching for file updates
      ${imports.reverse().map(function (file) { return fileImport(file) }).join('\n')}
    `)
  }

  function fileImport (file) {
    if (!file) return ''
    if (file.type === 'del') return `DEL: ${file.src.name}`

    const total = file.src.stat.size
    const name = file.dst.name.substr(1) // remove '/' at start
    let size

    // >500 mb show progress
    if (total < 5e8 || !file.progress) size = `(${pretty(total)})`
    else size = `(${pretty(file.progress)} / ${pretty(total)})`
    return output(`
      ADD: ${cliTruncate(name, process.stdout.columns - 7 - size.length, { position: 'start' })} ${size}
    `)
  }
}
