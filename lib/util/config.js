var fs = require('fs')
var path = require('path')
var abort = require('./abort.js')

var CONFIG_FILE = 'package.json'

module.exports = Config

function Config (args) {
  var config
  var configPath = getPath(args)

  if (fs.existsSync(configPath)) {
    try {
      var contents = fs.readFileSync(configPath)
      if (contents.toString().trim().length > 0) config = JSON.parse(contents)
    } catch (err) {
      console.error('Your package.json file is malformed.')
      abort(err, args)
    }
  } else {
    config = {}
  }

  if (typeof config.dat === 'undefined') config.dat = {}
  return config
}

Config.save = function (args, config) {
  var configPath = getPath(args)
  try {
    if (typeof config === 'object') config = JSON.stringify(config, null, 2)
    fs.writeFileSync(configPath, config)
  } catch (err) {
    console.error('Failed to write')
    abort(err, args)
  }
}

function getPath (args) {
  var dir
  if (args.path) dir = args.path
  else dir = process.cwd()
  return path.join(dir, CONFIG_FILE)
}
