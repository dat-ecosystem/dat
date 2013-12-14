var path = require('path')
var Dat = require('../../')

module.exports.paths = function(test, common) {
  test('.paths', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      var paths = dat.paths()
      t.equal(paths.dat, path.join(common.dat1tmp, '.dat'), 'dat path')
      t.equal(paths.level, path.join(common.dat1tmp, '.dat', 'store.dat'), 'level path')
      t.end()
    })
  })
}

module.exports.initExistsDestroy = function(test, common) {
  test('.init, .exists, .destroy', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      create(function() {
        destroy(function() {
          t.end()
        })
      })
    })
  
    function create(cb) {
      dat.exists(function(err, exists) {
        t.false(err, 'no err')
        t.false(exists, 'does not exist')
        dat.init(function(err, msg) {
          t.false(err, 'no err')
          dat.exists(function(err, exists) {
            t.false(err, 'no err')
            t.true(exists, 'exists')
            cb()
          })
        })
      })
    }
  
    function destroy(cb) {
      dat.destroy(function(err) {
        t.false(err, 'no err')
        dat.exists(function(err, exists) {
          t.false(err, 'no err')
          t.false(exists, 'does not exist')
          cb()
        })
      })
    }
  })
}

module.exports.existingRepo = function(test, common) {
  test('.init in existing repo', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      dat.init(function(err, msg) {
        t.false(err, 'no err')
        dat.init(function(err, msg) {
          t.true(msg, msg)
          dat.destroy(function(err) {
            t.false(err, 'no err')
            t.end()
          })
        })
      })
    })
  })  
}

module.exports.all = function (test, common) {
  module.exports.paths(test, common)
  module.exports.initExistsDestroy(test, common)
  module.exports.existingRepo(test, common)
}
