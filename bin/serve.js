var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('serve.txt')
var http = require('http')

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

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    db.status(function (err, status) {
      if (err) abort(err, args)
      var port = parseInt(args.port, 10)
      if (!port) abort(new Error('Invalid port specified: ' + port), args)
      console.log('Starting httpd on port: ' + port)
      var server = http.createServer(function (req, res) {
        req.pipe(db.replicate()).pipe(res)
      })
      server.listen(port)
    })
  })
}
