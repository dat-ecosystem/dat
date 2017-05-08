var prompt = require('prompt')
var Registry = require('../../registry')

module.exports = {
  name: 'login',
  command: login,
  options: []
}

function login (opts) {
  if (opts.email && opts.password) return makeRequest(opts)

  prompt.message = ''
  prompt.colors = false
  prompt.start()
  prompt.get([{
    name: 'email',
    description: 'Email',
    required: true
  },
  {
    name: 'password',
    description: 'Password',
    required: true,
    hidden: true,
    replace: '*'
  }], function (err, results) {
    if (err) return console.log(err.message)
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
      console.log('Logged in successfully.')
      process.exit(0)
    })
  }
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
