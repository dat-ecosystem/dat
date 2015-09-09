module.exports = abort

function abort (err, args, message) {
  if (!args) args = {}
  if (err.code === 'EPIPE') { process.exit(0) }

  var errMsg
  if (err) {
    if (err.message) errMsg = err.message
    else errMsg = err.toString()
  }
  if (message) errMsg = message

  if (args.json) {
    errMsg = {error: true, message: errMsg, code: err.code}
    if (args.verbose) errMsg.stack = err.stack
    console.log(JSON.stringify(errMsg))
  } else {
    if (args.verbose) {
      console.error(errMsg)
      console.error(err.stack)
    }
    else console.error(errMsg)
  }

  process.exit(1)
}
