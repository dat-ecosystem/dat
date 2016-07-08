var Dat = require('../lib/dat')

module.exports = function (args) {
  var dat = Dat(args)

  dat.on('ready', function () {
    console.error('not implemented')
  })
}
