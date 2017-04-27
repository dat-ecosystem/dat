
module.exports = onExit

function onExit (state, bus) {
  bus.on('exit:error', onError)
  bus.on('exit:warn', onError)

  function onError (err) {
    state.clear = true // TODO: put reset mechanism in neat-log
    bus.emit('render')
    console.error(err)
    process.exit(1)
  }
}
