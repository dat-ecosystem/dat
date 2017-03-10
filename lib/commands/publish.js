var Dat = require('dat-node')
var encoding = require('dat-encoding')
var prompt = require('prompt')
var Registry = require('../registry')
var ui = require('../ui')
var datJson = require('../dat-json')

module.exports = {
  name: 'publish',
  options: [],
  command: publish
}

function publish (opts) {
  var client = Registry(opts)
  if (!client.whoami().token) return ui.exitErr('Please login before publishing.')

  opts.createIfMissing = false // publish must always be a resumed archive
  Dat(opts.dir, opts, function (err, dat) {
    if (err) return ui.exitErr(err)

    datJson.read(dat, function (err, body) {
      if (err && err.code !== 'ENOENT') return ui.exitErr(err)
      dat.meta = body || {}
      publish(dat)
    })

    function publish (dat) {
      var datInfo = {
        name: dat.meta.name || opts.name,
        url: 'dat://' + encoding.toStr(dat.key),
        title: dat.meta.title,
        description: dat.meta.description,
        keywords: dat.meta.keywords
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
      datJson.write(dat, datInfo, function (err) {
        if (err) return ui.exitErr(err)
        client.secureRequest({
          method: 'POST', url: '/dats', body: datInfo, json: true
        }, function (err, resp, body) {
          if (err && err.message) ui.exitErr(err.message)
          else if (err) ui.exitErr(err.toString())
          if (body.statusCode === 400) return ui.exitErr(new Error(body.message))
          console.log('Successfully published!')
          process.exit(0)
        })
      })
    }
  })
}
