var fs = require('fs')
var getport = require('getport')
var debug = require('debug')('get-port')

module.exports = getPort

function getPort(startingPort, portFile, cb) {
  fs.readFile(portFile, function(err, buf) {
    if (err) return newPort()
    var port = +buf.toString()
    debug('read port from portFile: ' + port)
    gotPort(err, port)
  })
  
  function newPort() {
    getport(startingPort, function(err, port) {
      if (err) return gotPort(err)
      debug('writing new portFile ' + portFile)
      fs.writeFile(portFile, port.toString(), function(err) {
        gotPort(err, port)
      })
    })
  }
  
  function gotPort(err, port) {
    if (err) {
      debug('getport err: ' + err)
      return cb(err)
    }
    debug('getport got port ' + port)
    cb(err, port)
  }
}
