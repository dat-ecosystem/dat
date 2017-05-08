var Registry = require('../../registry')

module.exports = {
  name: 'whoami',
  command: whoami,
  options: []
}

function whoami (opts) {
  var client = Registry(opts)
  var login = client.whoami()
  if (!login.token) return exitErr('Not logged in.')
  console.log(login.email)
  process.exit(0)
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
