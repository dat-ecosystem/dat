module.exports = {
  name: 'publish',
  command: publish,
  help: [
    'Publish your dat to a Dat registry',
    'Usage: dat publish [<registry>]',
    '',
    'By default it will publish to your active registry.',
    'Specify the server to change where the dat is published.'
  ].join('\n'),
  options: [
    {
      name: 'server',
      help: 'Publish dat to this registry. Defaults to active login.'
    }
  ]
}

function publish (opts) {
  var path = require('path')
  var Dat = require('dat-node')
  var encoding = require('dat-encoding')
  var output = require('neat-log/output')
  var prompt = require('prompt')
  var chalk = require('chalk')
  var DatJson = require('dat-json')
  var xtend = Object.assign
  var Registry = require('../registry')

  if (!opts.dir) opts.dir = process.cwd()
  if (opts._[0]) opts.server = opts._[0]
  if (!opts.server) opts.server = 'datbase.org' // nicer error message if not logged in

  var client = Registry(opts)
  var whoami = client.whoami()
  if (!whoami || !whoami.token) {
    var loginErr = output(`
      Welcome to ${chalk.green(`dat`)} program!
      Publish your dats to ${chalk.green(opts.server)}.

      ${chalk.bold('Please login before publishing')}
      ${chalk.green('dat login')}

      New to ${chalk.green(opts.server)} and need an account?
      ${chalk.green('dat register')}

      Explore public dats at ${chalk.blue('datbase.org/explore')}
    `)
    return exitErr(loginErr)
  }

  opts.createIfMissing = false // publish must always be a resumed archive
  Dat(opts.dir, opts, function (err, dat) {
    if (err && err.name === 'MissingError') return exitErr('No existing dat in this directory. Create a dat before publishing.')
    else if (err) return exitErr(err)

    dat.joinNetwork() // join network to upload metadata

    var datjson = DatJson(dat.archive, { file: path.join(dat.path, 'dat.json') })
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
      var welcome = output(`
        Publishing dat to ${chalk.green(opts.server)}!

      `)
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
      console.log(`Please wait, '${chalk.bold(datInfo.name)}' will soon be ready for its great unveiling...`)
      client.dats.create(datInfo, function (err, resp, body) {
        if (err) {
          if (err.message) {
            if (err.message === 'timed out') {
              return exitErr(output(`${chalk.red('\nERROR: ' + opts.server + ' could not connect to your computer.')}
              Troubleshoot here: ${chalk.green('https://docs.datproject.org/troubleshooting#networking-issues')}
              `))
            }
            var str = err.message.trim()
            if (str === 'jwt expired') return exitErr(`Session expired, please ${chalk.green('dat login')} again`)
            return exitErr('ERROR: ' + err.message) // node error
          }

          // server response errors
          return exitErr('ERROR: ' + err.toString())
        }
        if (body.statusCode === 400) return exitErr(new Error(body.message))

        datjson.write(datInfo, function (err) {
          if (err) return exitErr(err)
          // TODO: write published url to dat.json (need spec)
          var msg = output(`

            We ${body.updated === 1 ? 'updated' : 'published'} your dat!
            ${chalk.blue.underline(`${opts.server}/${whoami.username}/${datInfo.name}`)}
          `)// TODO: get url back? it'd be better to confirm link than guess username/datname structure

          console.log(msg)
          if (body.updated === 1) {
            console.log(output(`

              ${chalk.dim.green('Cool fact #21')}
              ${opts.server} will live update when you are sharing your dat!
              You only need to publish again if your dat link changes.
            `))
          } else {
            console.log(output(`

              Remember to use ${chalk.green('dat share')} before sharing.
              This will make sure your dat is available.
            `))
          }
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
