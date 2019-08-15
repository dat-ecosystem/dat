const createServer = require('../tests/helpers/auth-server')

createServer(process.env.PORT || 8888, (err, server, closeServer) => {
  if (err) throw err

  process.on('exit', close)
  process.on('SIGINT', close)

  function close (cb) {
    closeServer(() => {
      process.exit()
    })
  }
})
