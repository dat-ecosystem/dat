var fs = require('fs')

module.exports = function (path) {
  console.error(fs.readFileSync(path).toString())
  process.exit(1)
}
