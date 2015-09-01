var http = require('http')
var getport = require('getport')
var pump = require('pump')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('serve.txt')
var debug = require('debug')('dat-serve')
var debugStream = require('debug-stream')

var version = require('../package.json').version

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

  getport(6442, function (err, port) {
    if (err) abort(err, args)
    return serve(port)
  })

  function serve (port) {
    openDat(args, function (err, db) {
      if (err) abort(err, args)
      if (!port) abort(new Error('Invalid port: ' + port), args)
      console.error('Listening on port ' + port + (args.readonly ? ' (readonly)' : ''))

      var server = http.createServer(function (req, res) {
        debug(req.method, req.url, req.connection.remoteAddress)

        if (req.method === 'GET') {
          db.status(function (err, status) {
            if (err) abort(err, args)
            db.listDatasets(function (err, datasets) {
              if (err) abort(err, args)
              res.setHeader('content-type', 'application/json')
              var result = {
                dat: true,
                version: version,
                status: status,
                datasets: datasets
              }
              res.end(JSON.stringify(result))
              return
            })
          })
        } else if (req.method === 'POST') {
          var replicate = args.readonly ? db.push() : db.replicate()

          var start = Date.now()
          replicate.on('finish', function () {
            debug('replication finished in', (Date.now() - start) + 'ms')
          })

          var loggers = {
            out: debugStream(debugLogger('out')),
            in: debugStream(debugLogger('in'))
          }

          if (!loggers.out.enabled) pump(req, replicate, res)
          else pump(req, loggers.in(), replicate, loggers.out(), res)
          return
        } else {
          // if not GET or POST
          res.statusCode = 405
          res.end()
        }
      })

      server.on('connection', function (socket) {
        socket.setNoDelay(true) // http://neophob.com/2013/09/rpc-calls-and-mysterious-40ms-delay/
      })

      server.listen(port)
    })
  }
}

function debugLogger (prefix) {
  return function (buf) {
    debug(prefix, {length: buf.length})
  }
}
