var prompt = require('prompt')
var TownshipClient = require('../township')
var ui = require('../ui')

module.exports = {
  name: 'unpublish',
  options: [],
  command: unpublish
}

function unpublish (opts) {
  var client = TownshipClient(opts)
  if (!client.getLogin().token) return ui.exitErr('Please login before unpublishing.')
  var name = opts._[0]
  if (!name) return ui.exitErr('Name required.')
  prompt.message = ''
  prompt.colors = false
  prompt.start()
  prompt.get([{
    name: 'sure',
    description: 'Are you sure? This cannot be undone. [y/n]',
    pattern: /^[a-zA-Z\s-]+$/,
    message: '',
    required: true
  }], function (err, results) {
    if (err) return console.log(err.message)
    if (results.sure === 'yes' || results.sure === 'y') makeRequest(name)
    else ui.exitErr('Cancelled.')
  })

  function makeRequest (datInfo) {
    console.log(`Unpublishing "${datInfo.name}".`)
    client.secureRequest({
      method: 'DELETE', url: '/dats', body: {name: name}, json: true
    }, function (err, resp, body) {
      if (err && err.message) ui.exitErr(err.message)
      else if (err) ui.exitErr(err.toString())
      if (body.statusCode === 400) return ui.exitErr(new Error(body.message))
      console.log('Done.')
      process.exit(0)
    })
  }
}
