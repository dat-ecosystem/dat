var createServer = require('../tests/helpers/auth-server')

createServer(process.env.PORT || 8888, function (err, server, closeServer) {
  if (err) throw err

  process.on('exit', close)
  process.on('SIGINT', close)

  function close (cb) {
    closeServer(function () {
      process.exit()
    })
  }
})
