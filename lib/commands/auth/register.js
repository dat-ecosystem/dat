var prompt = require('prompt')
// var ui = require('../../ui')
var Registry = require('../../registry')

module.exports = {
  name: 'register',
  command: register,
  options: []
}

function register (opts) {
  if (opts.email && opts.username && opts.password) return makeRequest(opts)

  prompt.message = ''
  prompt.colors = false
  prompt.start()
  prompt.get([{
    name: 'email',
    description: 'Email',
    required: true
  },
  {
    name: 'username',
    description: 'Username',
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

    client.register({
      email: user.email,
      username: user.username,
      password: user.password
    }, function (err) {
      if (err && err.message) ui.exitErr(err.message)
      else if (err) ui.exitErr(err.toString())
      console.log('Registered successfully.')
      process.exit(0)
    })
  }
}
