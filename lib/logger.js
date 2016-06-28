var singleLineLog = require('single-line-log')

var messageQueue = []
var statusLines = []
var statusLastLine = ''

module.exports = function (args) {
  var logger = getLogger(args)

  var LOG_INTERVAL = (args.logspeed ? +args.logspeed : 200)
  if (isNaN(LOG_INTERVAL)) LOG_INTERVAL = 200

  setInterval(function () {
    print()
  }, LOG_INTERVAL)
  print()

  process.on('exit', function (code) {
    if (code !== 1) print()
  })

  return {
    message: message,
    status: status
  }

  function message (msg) {
    messageQueue.push(msg)
  }

  function status (msg, lineNum) {
    if (typeof lineNum === 'undefined') statusLines = [msg]
    else if (lineNum === -1) statusLastLine = msg
    else if (lineNum < statusLines.length) statusLines[lineNum] = msg
    else statusLines.push(msg)
  }

  function print () {
    logger.stdout() // Clear old stdout before printing messages
    while (true) {
      if (messageQueue.length === 0) break
      logger.log(messageQueue[0])
      messageQueue.shift()
    }
    if (statusLines.length || statusLastLine.length) {
      var msg = statusLines.join('\n')
      msg += '\n' + statusLastLine
      logger.stdout(msg)
    }
  }
}

function getLogger (opts) {
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
