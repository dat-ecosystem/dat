module.exports = {
  name: 'whoami',
  command: whoami,
  help: [
    'Get login information',
    'Usage: dat login [<registry>]',
    '',
    'Get information for active registry or specify your registry.'
  ].join('\n'),
  options: [
    {
      name: 'server',
      help: 'Server to get login information for. Defaults to active login.'
    }
  ]
}

function whoami (opts) {
  var output = require('neat-log/output')
  var chalk = require('chalk')
  var Registry = require('../../registry')

  if (opts._[0]) opts.server = opts._[0]

  var client = Registry(opts)
  var login = client.whoami()
  if (!login || !login.token) {
    if (!opts.server) return exitErr('No login information found.')
    return exitErr('No login information found for that server.')
  }
  console.log(output(`
    Your active Dat registry information:

    ---
    ${chalk.green(login.server)}
    Email: ${login.email}
    Username: ${login.username}
    ---

    Change your registry by logging in again:
    ${chalk.dim.green('dat login <registry-url>')}
  `))
  process.exit(0)
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
