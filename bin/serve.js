var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('serve.txt')
var http = require('http')
var getport = require('getport')

module.exports = {
  name: 'serve',
  command: startDatServer,
  options: [
    {
      name: 'port',
      boolean: false,
      abbr: 'p'
    }
  ]
}

function startDatServer (args) {
  if (args.help) return usage()
  if (args.port) return serve(parseInt(args.port, 10))

  getport(6442, function (err, port) {
    if (err) abort (err, args)
    return serve(port)
  })

  function serve (port) {
    openDat(args, function (err, db) {
      if (err) abort(err, args)
      if (!port) abort(new Error('Invalid port: ' + port), args)

      console.error('Listening on port ' + port)
      var server = http.createServer(function (req, res) {
        pump(req, db.replicate(), res)
      })
      server.listen(port)
    })
  }
}
