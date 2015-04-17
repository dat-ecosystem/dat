var fs = require('fs')
var path = require('path')

var config = {
  checkout: getContents('checkout')
}

function getContents (location) {
  try {
    return fs.readFileSync(path.join(process.cwd(), '.dat', location)).toString()
  }
  catch (err) {
    return null
  }
}

module.exports = config
