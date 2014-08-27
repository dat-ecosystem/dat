var ansimd = require('ansimd')
var fs = require('fs')
var path = require('path')

module.exports = function(dat, opts, cb) {
  var help = fs.readFileSync(path.join(__dirname, '..', 'docs', 'cli-usage.md'))
  console.log(ansimd(help))
  process.nextTick(cb)
}