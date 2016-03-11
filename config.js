var homeDir = require('os-homedir')
var path = require('path')
var fs = require('fs')
var extend = require('xtend')

var CONFIG_FILE = 'dat.json'

module.exports = function (cwd) {
  var localConfig = read(path.join(cwd, CONFIG_FILE))
  var globalConfig = read(path.join(homeDir(), 'dat.json'))
  return extend(globalConfig, localConfig)
}

var read = function (file) {
  try {
    var buf = fs.readFileSync(file)
  } catch (err) {
    return {
      ignore: []
    }
  }
  return JSON.parse(buf.toString())
}
