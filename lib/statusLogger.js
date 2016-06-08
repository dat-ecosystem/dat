var getLogger = require('../logger')

module.exports = StatusLogger

function StatusLogger (args) {
  if (!(this instanceof StatusLogger)) return new StatusLogger(args)

  var logger = getLogger(args)

  var LOG_INTERVAL = (args.logspeed ? +args.logspeed : 200)
  if (isNaN(LOG_INTERVAL)) LOG_INTERVAL = 200

  var messageQueue = []
  var statusLines = []
  var statusLastLine = ''

  this.message = function (msg) {
    messageQueue.push(msg)
  }

  this.status = function (msg, lineNum) {
    if (typeof lineNum === 'undefined') statusLines = [msg]
    else if (lineNum === -1) statusLastLine = msg
    else if (lineNum < statusLines.length) statusLines[lineNum] = msg
    else statusLines.push(msg)
  }

  this.logNow = function () {
    // send last updates before exiting process
    print()
  }

  setInterval(function () {
    print()
  }, LOG_INTERVAL)
  print()

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
