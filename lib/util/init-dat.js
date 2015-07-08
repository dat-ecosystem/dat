var dat = require('dat-core')
var debug = require('debug')('init-dat')

module.exports = function (args, cb) {
  debug('init', args.path)
  tryOpen()

  function tryOpen () {
    var db = dat(args.path, {valueEncoding: 'json'})
    db.on('error', create)
    db.on('ready', ready)

    function ready () {
      cb(null, {exists: true}, db)
    }
  }

  function create () {
    var db = dat(args.path, {createIfMissing: true, valueEncoding: 'json'})

    db.on('error', function error (err) {
      cb(err)
    })

    db.on('ready', function ready () {
      cb(null, {created: true}, db)
    })
  }
}
