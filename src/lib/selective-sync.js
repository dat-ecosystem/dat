const fs = require('fs')
const path = require('path')

module.exports = function (state, opts) {
  // selective sync stuff
  const parsing = opts.selectFromFile !== '.datdownload' ? opts.selectFromFile : path.join(opts.dir, '.datdownload')
  opts.selectedFiles = parseFiles(parsing)
  if (opts.select && typeof opts.select === 'string') opts.selectedFiles = opts.select.split(',')
  if (opts.selectedFiles) {
    state.title = 'Syncing'
    state.selectedByteLength = 0
    opts.sparse = true
  }
  return state
}

function parseFiles (input) {
  let parsed = null

  try {
    if (fs.statSync(input).isFile()) {
      parsed = fs.readFileSync(input).toString().trim().split(/\r?\n/)
    }
  } catch (err) {
    if (err && !err.name === 'ENOENT') {
      console.error(err)
      process.exit(1)
    }
  }

  return parsed
}
