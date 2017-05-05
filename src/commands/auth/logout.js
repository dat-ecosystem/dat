var Registry = require('../../registry')

module.exports = {
  name: 'logout',
  command: logout,
  options: []
}

function logout (opts) {
  var client = Registry(opts)

  if (!client.whoami().token) return exitErr('Not logged in.')
  client.logout(function (err) {
    if (err) return exitErr(err)
    console.log('Logged out.')
    process.exit(0)
  })
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
