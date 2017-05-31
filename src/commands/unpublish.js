var prompt = require('prompt')
var path = require('path')
var Dat = require('dat-node')
var output = require('neat-log/output')
var chalk = require('chalk')
var DatJson = require('dat-json')
var Registry = require('../registry')

module.exports = {
  name: 'unpublish',
  options: [],
  command: unpublish
}

function unpublish (opts) {
  var client = Registry(opts)
  if (!client.whoami().token) {
    var loginErr = output`
      Welcome to ${chalk.green(`dat`)} program!

      ${chalk.bold('You must login before unpublishing.')}
      ${chalk.green('dat login')}
    `
    return exitErr(loginErr)
  }
  if (opts._[0]) return confirm(opts._[0])

  if (!opts.dir) opts.dir = process.cwd() // run in dir for `dat unpublish`

  opts.createIfMissing = false // unpublish dont try to create new one
  Dat(opts.dir, opts, function (err, dat) {
    if (err) return exitErr(err)
    // TODO better error msg for non-existing archive

    var datjson = DatJson(dat.archive, {file: path.join(dat.path, 'dat.json')})
    datjson.read(function (err, data) {
      if (err) return exitErr(err)
      if (!data.name) return exitErr('Try `dat unpublish <name>` with this dat, we are having trouble reading it.')
      confirm(data.name)
    })
  })

  function confirm (name) {
    console.log(`Unpublishing '${chalk.bold(name)}'.`)
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
      else exitErr('Cancelled.')
    })
  }

  function makeRequest (name) {
    client.secureRequest({
      method: 'DELETE', url: '/dats', body: {name: name}, json: true
    }, function (err, resp, body) {
      if (err && err.message) exitErr(err.message)
      else if (err) exitErr(err.toString())
      if (body.statusCode === 400) return exitErr(new Error(body.message))
      console.log('Done.')
      process.exit(0)
    })
  }
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
