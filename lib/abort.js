module.exports = abort

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}
