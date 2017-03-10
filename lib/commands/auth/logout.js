var ui = require('../../ui')
var Registry = require('../../registry')

module.exports = {
  name: 'logout',
  command: logout,
  options: []
}

function logout (opts) {
  var client = Registry(opts)

  if (!client.whoami().token) return ui.exitErr('Not logged in.')
  client.logout(function (err) {
    if (err) ui.exitErr(err)
    console.log('Logged out.')
    process.exit(0)
  })
}
