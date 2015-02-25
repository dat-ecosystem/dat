var http = require('http')
var corsify = require('corsify')
var debug = require('debug')('rest-server')

// TODO set socket timeout
// TODO don't mutate builtin server object

module.exports = function createServer(handler) {
  var cors = corsify({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization"
    // todo add whitelist to options
  })
  
  var server = http.createServer(cors(handle))
  
  // make externally available
  server._cors = cors
    
  server.on('connection', function(socket) {
    // makes rpc fast on ubuntu http://neophob.com/2013/09/rpc-calls-and-mysterious-40ms-delay/
    socket.setNoDelay()
  })
  
  function handle(req, res) {
    debug(req.connection.remoteAddress + ' - ' + req.method + ' - ' + req.url)
    return handler(req, res)
  }
  
  return server
}

