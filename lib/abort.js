module.exports = abort

function abort (err, args, message) {
  if (message) console.error(message)
  else if (err.message) console.error(err.message)
  else console.error(err)

  if (args && args.verbose) console.error(err.stack)
  process.exit(1)
}
