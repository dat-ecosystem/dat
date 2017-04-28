
module.exports = onExit

function onExit (state, bus) {
  bus.on('exit:error', onError)
  bus.on('exit:warn', onError)

  function onError (err) {
    bus.clear()
    console.error(err)
    process.exit(1)
  }
}
