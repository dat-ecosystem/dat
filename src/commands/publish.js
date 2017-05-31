var path = require('path')
var Dat = require('dat-node')
var encoding = require('dat-encoding')
var output = require('neat-log/output')
var prompt = require('prompt')
var chalk = require('chalk')
var DatJson = require('dat-json')
var xtend = require('xtend')
var Registry = require('../registry')

module.exports = {
  name: 'publish',
  options: [],
  command: publish
}

function publish (opts) {
  var client = Registry(opts)
  if (!client.whoami().token) {
    var loginErr = output`
      Welcome to ${chalk.green(`dat`)} program!
      Publish your dats to datproject.org.

      ${chalk.bold('Please login before publishing')}
      ${chalk.green('dat login')}

      New to datproject.org and need an account?
      ${chalk.green('dat register')}

      Explore public dats at ${chalk.blue('datproject.org/explore')}
    `
    return exitErr(loginErr)
  }

  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  opts.createIfMissing = false // publish must always be a resumed archive
  Dat(opts.dir, opts, function (err, dat) {
    if (err) return exitErr(err)
    // TODO better error msg for non-existing archive

    var datjson = DatJson(dat.archive, {file: path.join(dat.path, 'dat.json')})
    datjson.read(publish)

    function publish (_, data) {
      // ignore datjson.read() err, we'll prompt for name

      // xtend dat.json with opts
      var datInfo = xtend({
        name: opts.name,
        url: 'dat://' + encoding.toStr(dat.key), // force correct url in publish? what about non-dat urls?
        title: opts.title,
        description: opts.description
      }, data)
      var welcome = output`
        Publishing your dat to ${chalk.green(`datproject.org`)}!
        ${chalk.dim('datproject.org/<username>/<dat-name>')}

      `
      console.log(welcome)

      if (datInfo.name) return makeRequest(datInfo)

      prompt.message = ''
      prompt.start()
      prompt.get({
        properties: {
          name: {
            description: chalk.magenta('dat name'),
            pattern: /^[a-zA-Z0-9-]+$/,
            message: `A dat name can only have letters, numbers, or dashes.\n Like ${chalk.bold('cool-cats-12meow')}`,
            required: true
          }
        }
      }, function (err, results) {
        if (err) return exitErr(err)
        datInfo.name = results.name
        makeRequest(datInfo)
      })
    }

    function makeRequest (datInfo) {
      console.log(`'${chalk.bold(datInfo.name)}' will soon be ready for its great unveiling.`)
      client.secureRequest({
        method: 'POST', url: '/dats', body: datInfo, json: true
      }, function (err, resp, body) {
        if (err) return exitErr(err)
        if (body.statusCode === 400) return exitErr(new Error(body.message))

        datjson.write(datInfo, function (err) {
          if (err) return exitErr(err)
          var msg = output`

            We published your dat!

            datproject.org will live update when you are syncing your dat.
            You only need to publish again if your dat link changes.
          ` // TODO: get url back? it'd be nice to link it
          console.log(msg)
          process.exit(0)
        })
      })
    }
  })
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
