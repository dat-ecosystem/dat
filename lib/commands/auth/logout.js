var ui = require('../../ui')
var TownshipClient = require('../../township')

module.exports = {
  name: 'logout',
  command: logout,
  options: []
}

function logout (opts) {
  var client = TownshipClient(opts)

  if (!client.getLogin().token) return ui.exitErr('Not logged in.')
  client.logout(function (err) {
    if (err) ui.exitErr(err)
    console.log('Logged out.')
    process.exit(0)
  })
}
