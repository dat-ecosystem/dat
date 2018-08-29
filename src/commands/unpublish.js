module.exports = {
  name: 'unpublish',
  command: unpublish,
  options: [
    {
      name: 'server',
      help: 'Unpublish dat from this Registry.'
    },
    {
      name: 'confirm',
      default: false,
      boolean: true,
      abbr: 'y',
      help: 'Confirm you want to unpublish'
    }
  ]
}

function unpublish (opts) {
  var prompt = require('prompt')
  var path = require('path')
  var Dat = require('dat-node')
  var output = require('neat-log/output')
  var chalk = require('chalk')
  var DatJson = require('dat-json')
  var Registry = require('../registry')

  if (opts._[0]) opts.server = opts._[0]
  if (!opts.dir) opts.dir = process.cwd() // run in dir for `dat unpublish`

  var client = Registry(opts)
  var whoami = client.whoami()
  if (!whoami || !whoami.token) {
    var loginErr = output(`
      Welcome to ${chalk.green(`dat`)} program!

      ${chalk.bold('You must login before unpublishing.')}
      ${chalk.green('dat login')}
    `)
    return exitErr(loginErr)
  }

  opts.createIfMissing = false // unpublish dont try to create new one
  Dat(opts.dir, opts, function (err, dat) {
    if (err) return exitErr(err)
    // TODO better error msg for non-existing archive
    if (!dat.writable) return exitErr('Sorry, you can only publish a dat that you created.')

    var datjson = DatJson(dat.archive, { file: path.join(dat.path, 'dat.json') })
    datjson.read(function (err, data) {
      if (err) return exitErr(err)
      if (!data.name) return exitErr('Try `dat unpublish <name>` with this dat, we are having trouble reading it.')
      confirm(data.name)
    })
  })

  function confirm (name) {
    console.log(`Unpublishing '${chalk.bold(name)}' from ${chalk.green(whoami.server)}.`)
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
    client.dats.delete({ name: name }, function (err, resp, body) {
      if (err && err.message) exitErr(err.message)
      else if (err) exitErr(err.toString())
      if (body.statusCode === 400) return exitErr(new Error(body.message))
      console.log(`Removed your dat from ${whoami.server}`)
      process.exit(0)
    })
  }
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
