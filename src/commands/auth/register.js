module.exports = {
  name: 'register',
  command: register,
  help: [
    'Register with a public Dat registry',
    'Usage: dat register [<registry>]',
    '',
    'Register with datbase.org or other registries to publish your dats.'
  ].join('\n'),
  options: [
    {
      name: 'server',
      help: 'Your Dat registry.'
    }
  ]
}

function register (opts) {
  var prompt = require('prompt')
  var output = require('neat-log/output')
  var chalk = require('chalk')
  var Registry = require('../../registry')

  // TODO: check if logged in?
  if (opts._[0]) opts.server = opts._[0]
  var welcome = output(`
    Welcome to ${chalk.green(`dat`)} program!
    Create a new account with a Dat registry.

  `)
  console.log(welcome)

  var schema = {
    properties: {
      server: {
        description: chalk.magenta('Dat registry'),
        default: opts.server || 'datbase.org',
        required: true
      },
      username: {
        description: chalk.magenta('Username'),
        message: 'Username required',
        required: true
      },
      email: {
        description: chalk.magenta('Email'),
        message: 'Email required',
        required: true
      },
      password: {
        description: chalk.magenta('Password'),
        message: 'Password required',
        required: true,
        hidden: true,
        replace: '*'
      }
    }
  }

  prompt.override = opts
  prompt.message = ''
  prompt.start()
  prompt.get(schema, function (err, results) {
    if (err) return exitErr(err)
    opts.server = results.server
    makeRequest(results)
  })

  function makeRequest (user) {
    var client = Registry(opts)

    client.register({
      email: user.email,
      username: user.username,
      password: user.password
    }, function (err) {
      if (err && err.message) return exitErr(err.message)
      else if (err) return exitErr(err.toString())
      console.log(output(`
        Created account on ${chalk.green(opts.server)}!

        Login to start publishing: ${chalk.green(`dat login`)}
      `))
      process.exit(0)
    })
  }
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
