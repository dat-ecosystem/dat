var fs = require('fs')
var path = require('path')
var abort = require('./abort.js')

var CONFIG_FILE = 'package.json'

module.exports = function (args) {
  var dir
  if (args.path) dir = args.path
  else dir = process.cwd()

  var configPath = path.join(dir, CONFIG_FILE)
  var config

  if (fs.existsSync(configPath)) {
    try {
      var contents = fs.readFileSync(configPath)
      if (contents.toString().trim().length > 0) config = JSON.parse(contents)
    } catch (err) {
      console.error('Your package.json file is malformed.')
      abort(err)
    }
  } else {
    config = {}
  }

  if (typeof config.dat === 'undefined') config.dat = {}

  return config
}
