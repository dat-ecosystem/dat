var fs = require('fs')
var getport = require('getport')
var debug = require('debug')('get-port')

module.exports = getPort

module.exports.readPort = readPort

function getPort(startingPort, portFile, cb) {
  readPort(portFile, function(err, port) {
    if (err) return newPort()
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

function readPort(portFile, cb) {
  fs.readFile(portFile, function(err, buf) {
    if (err) return cb(err)
    var port = +buf.toString()
    debug('read port from portFile: ' + port)
    cb(err, port)
  })
}