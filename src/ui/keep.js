var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var importUI = require('./components/import-progress')

module.exports = statusUI

function statusUI (state) {
  if (!state.dat || !state.backup) return 'Starting Dat program...'
  if (!state.backup.ready) return 'Reading local Dat backup...'
  if (state.opts.list) return listUI(state)
  if (state.opts.remove) return deleteUI(state)

  if (state.opts.serve) {
    return output`
      Serving dat from backup.
    `
  }

  if (state.exiting) {
    return output`
      Dat saved to local history.
      Use 'dat keep --list' to view backed up files.
      Latest Version: ${state.dat.version}
    `
  }

  if (state.backup.running) {
    return output`
      Running keep to local backup...
    `
  }

  return output`
    Importing latest updates before keeping data.

    ${importUI(state)}
  `
}

function listUI (state) {
  if (!state.backup.list.length) {
    return 'No files in local backup.'
  }

  var versionPad = state.backup.list.slice(-1)[0].version.toString().length
  var files = state.backup.list.map(function (file) {
    return `[${pad(file.version, versionPad)}] ${chalk.bold(file.name)}, ${new Date(file.value.mtime).toLocaleString()}`
  }).join('\n')

  // Not sure it's helpful to print directory unless its configured
  // var dir = `~/.dat${state.backup.dir.split('/.dat')[1]}`

  return output`
    Local Backup Contents:

    ${files}

    [version] filename, mtime
  `

  function pad (str, len) {
    if (typeof str !== 'string') str = str.toString()

    return `${new Array(len - str.length + 1).join(' ')}${str}`
  }
}

function deleteUI (state) {
  if (state.exiting) return output`
    Removed versions from local backup:
    Deleted ${state.backup.removeRange.length > 1 ? state.backup.removeRange.join('-') : state.backup.removeRange[0] }
  `

  return 'Removing versions from local backup...'
}
