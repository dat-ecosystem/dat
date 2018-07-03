
module.exports = onExit

function onExit (state, bus) {
  bus.on('exit:error', onError)
  bus.on('exit:warn', function (err) {
    onError(err, true)
  })
  bus.on('exit', function () {
    state.exiting = true
    bus.render()
    process.exit()
  })

  function onError (err, clear) {
    if (clear) bus.clear()
    console.error(err)
    process.exit(1)
  }
}
