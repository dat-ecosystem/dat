module.exports = abort

function abort (err, args, message) {
  if (!args) args = {}

  var errMsg
  if (message) errMsg = message
  if (err) {
    if (err.message) errMsg = err.message
    else errMsg = err.toString()
  }

  if (args.json) {
    errMsg = {error: true, message: errMsg}
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
