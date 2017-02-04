var ui = require('../../ui')
var TownshipClient = require('../../township')

module.exports = {
  name: 'whoami',
  command: whoami,
  options: []
}

function whoami (opts) {
  var client = TownshipClient(opts)
  var login = client.getLogin()
  if (!login.token) return ui.exitErr('Not logged in.')
  console.log(login.email)
  process.exit(0)
}
