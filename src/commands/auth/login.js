var prompt = require('prompt')
var output = require('neat-log/output')
var chalk = require('chalk')
var Registry = require('../../registry')

module.exports = {
  name: 'login',
  command: login,
  options: []
}

function login (opts) {
  if (opts.email && opts.password) return makeRequest(opts)

  var welcome = output`
    Welcome to ${chalk.green(`dat`)} program!
    Login to get started publishing your dats.

  `
  var outro = output`

    Logged you in to ${chalk.green('datproject.org')}!

    Now you can publish dats and share:
    * Run ${chalk.green(`dat publish`)} to publish a dat!
    * View & Share your dat at datproject.org/<username>/<dat-name>
  `

  console.log(welcome)

  var schema = {
    properties: {
      email: {
        description: chalk.magenta('Email'),
        required: true
      },
      password: {
        description: chalk.magenta('Password'),
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
    makeRequest(results)
  })

  function makeRequest (user) {
    var client = Registry(opts)

    client.login({
      email: user.email,
      password: user.password
    }, function (err, resp, body) {
      if (err && err.message) return exitErr(err.message)
      else if (err) return exitErr(err.toString())
      console.log(outro)
      process.exit(0)
    })
  }
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
