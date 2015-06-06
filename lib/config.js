var fs = require('fs')
var path = require('path')
var abort = require('../lib/abort.js')

var CONFIG_FILE = 'dat.json'

module.exports = function () {
  if (fs.existsSync(CONFIG_FILE)) {
    var contents = fs.readFileSync(CONFIG_FILE)
    try {
      config = JSON.parse(contents)
    } catch (err) {
      console.error('Your dat.json file is malformed.')
      abort(err)
    }
  } else {
    config = {}
  }
  return config
}