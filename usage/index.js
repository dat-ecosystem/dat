var path = require('path')
var fs = require('fs')

module.exports = function (file) {
  console.error(fs.readFileSync(path.join(__dirname, file)).toString())
  process.exit(1)
}
