var singleLineLog = require('single-line-log')

module.exports = function getLogger (opts) {
  if (opts.quiet) {
    return {
      stderr: logQuiet,
      stdout: logQuiet,
      log: logQuiet,
      error: logQuiet
    }
  }

  if (opts.debug) {
    return {
      stderr: console.error.bind(console),
      stdout: console.log.bind(console),
      log: console.error.bind(console),
      error: console.log.bind(console)
    }
  }

  return {
    stderr: singleLineLog.stderr,
    stdout: singleLineLog.stdout,
    log: console.log.bind(console),
    error: console.error.bind(console)
  }
}

function logQuiet () {
  // do nothing
}
