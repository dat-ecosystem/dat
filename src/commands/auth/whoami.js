var Registry = require('../../registry')

module.exports = {
  name: 'whoami',
  command: whoami,
  options: []
}

function whoami (opts) {
  var client = Registry(opts)
  var login = client.whoami()
  if (!login.token) return ui.exitErr('Not logged in.')
  console.log(login.email)
  process.exit(0)
}
