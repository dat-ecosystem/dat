var fs = require('fs')
var path = require('path')

module.exports = function (location) {
  return function () {
    return usage(location)
  }
}

function usage (location) {
  console.error(fs.readFileSync(path.join(__dirname, '..', 'usage', location)).toString())
}
