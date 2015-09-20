var http = require('http')
var getport = require('getport')
var pump = require('pump')
var route = require('../lib/serve.js')
var register = require('register-multicast-dns')
var config = require('../lib/util/config.js')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('serve.txt')
var debug = require('debug')('dat-serve')

module.exports = {
  name: 'serve',
  command: startDatServer,
  options: [
    {
      name: 'port',
      boolean: false,
      abbr: 'p',
      default: process.env.PORT
    }, {
      name: 'readonly',
      boolean: true,
      abbr: 'r'
    }
  ]
}

function startDatServer (args) {
  if (args.help) return usage()
  if (args.port) return serve(parseInt(args.port, 10))

  try {
    var name = config(args).name + '.dat'
  } catch (err) {
    // do nothing
  }

  getport(6442, function (err, port) {
    if (err) abort(err, args)
    return serve(port)
  })

  function serve (port) {
    if (name) register(name)
    openDat(args, function (err, db) {
      if (err) abort(err, args)
      if (!port) abort(new Error('Invalid port: ' + port), args)
      console.error('Listening on port ' + port + (args.readonly ? ' (readonly)' : ''))

      var server = http.createServer(function (req, res) {
        debug(req.method, req.url, req.connection.remoteAddress)

        if (req.method === 'GET') {
          route.information(db, args, function (err, data) {
            if (err) abort(err, args)
            res.setHeader('content-type', 'application/json')
            res.end(data)
          })
        } else if (req.method === 'POST') {
          return pump(req, route.replication(db, args), res)
        } else {
          res.statuscode = 405
          res.end()
        }
      })

      server.on('connection', function (socket) {
        socket.setNoDelay(true) // http://neophob.com/2013/09/rpc-calls-and-mysterious-40ms-delay/
      })

      // keep connections open for a long time (for e.g. --live)
      server.setTimeout(86400)

      server.listen(port)
    })
  }
}
