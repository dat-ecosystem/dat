var Dat = require('dat-node')
var encoding = require('dat-encoding')
var prompt = require('prompt')
var Registry = require('../registry')

module.exports = {
  name: 'publish',
  options: [],
  command: publish
}

function publish (opts) {
  var client = Registry(opts)
  if (!client.whoami().token) return exitErr('Please login before publishing.')

  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  opts.createIfMissing = false // publish must always be a resumed archive
  Dat(opts.dir, opts, function (err, dat) {
    if (err) return exitErr(err)
    publish()

    function publish () {
      var datInfo = {
        name: opts.name,
        url: 'dat://' + encoding.toStr(dat.key),
        title: opts.title,
        description: opts.description,
        keywords: opts.keywords
      }

      if (!datInfo.name) {
        prompt.message = ''
        prompt.colors = false
        prompt.start()
        prompt.get([{
          name: 'name',
          pattern: /^[a-zA-Z\s-]+$/,
          message: 'Name must be only letters, spaces, or dashes',
          required: true
        }], function (err, results) {
          if (err) return console.log(err.message)
          console.log(results.name)
          datInfo.name = results.name
          makeRequest(datInfo)
        })
      } else {
        makeRequest(datInfo)
      }
    }

    function makeRequest (datInfo) {
      console.log(`Publishing archive with name "${datInfo.name}".`)
      client.secureRequest({
        method: 'POST', url: '/dats', body: datInfo, json: true
      }, function (err, resp, body) {
        if (err && err.message) exitErr(err.message)
        else if (err) exitErr(err.toString())
        if (body.statusCode === 400) return exitErr(new Error(body.message))
        console.log('Successfully published!')
        process.exit(0)
      })
    }
  })
}

function exitErr (err) {
  console.error(err)
  process.exit(1)
}
