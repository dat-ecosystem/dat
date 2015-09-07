var cliprompt = require('cli-prompt')
var abort = require('./abort.js')
var urlauth = require('./url-auth.js')

var retries = 0
var MAX_RETRIES = 3

module.exports = function (args, cb) {
  if (retries >= MAX_RETRIES) abort(new Error('Max retries exceeded.'))
  retries += 1
  console.error('Authentication required.')
  cliprompt('Username: ', function (username) {
    cliprompt.password('Password: ', function (password) {
      args._[0] = urlauth(args._[0], username, password)
      return cb(args)
    })
  })
}
