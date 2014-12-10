var ansimd = require('ansimd')
var fs = require('fs')
var path = require('path')

module.exports = help

help.noDat = true

function help(dat, opts, cb) {
  var help = fs.readFileSync(path.join(__dirname, '..', 'docs', 'cli-usage.md'))
  console.log(ansimd(help))
  process.nextTick(cb)
}