var Dat = require('dat-js')

module.exports = function (args) {
  var dat = Dat(args)

  dat.on('ready', function () {
    console.error('not implemented')
  })
}
