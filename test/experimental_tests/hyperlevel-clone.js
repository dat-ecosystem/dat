var concat = require('concat-stream')
var Dat = require('../../')

module.exports.clone = function(test, common) {
  test('clone from hyperlevel server', function(t) {
    
    setup()
    
    // opens dat1tmp, isntalls leveldown-hyper, closes
    function setup() {
      var dat = new Dat(common.dat1tmp, { serve: false }, function ready(err) {
        t.notOk(err, 'no open err')
        dat.backend('leveldown-hyper', function(err) {
          t.notOk(err, 'backend should not err')
          dat.close(function(err) {
            t.notOk(err, 'no close err')
            clone()
          })
        })
      })
    }
    
    function clone(cb) {
      var dat = new Dat(common.dat1tmp, function ready(err) {
        t.notOk(err, 'no open err on leveldown-hyper db')
        dat.put({foo: 'bar'}, function(err) {
          t.notOk(err, 'no put err')
          var dat2 = new Dat(common.dat2tmp, function ready(err) {
            t.notOk(err, 'no open err on leveldown db')
            return cleanup(dat, dat2)
            
            // var remote = 'http://localhost:' + dat.defaultPort
            // dat2.clone(remote, function(err) {
            //   t.notOk(err, 'no err on clone')
            //   dat2.createReadStream().pipe(concat(function(data) {
            //     t.equal(data.length, 1)
            //     var first = data[0] || {}
            //     t.equal(first.foo, 'bar')
            //     cleanup(dat, dat2)
            //   }))
            // })
          })
        })
      })
    }
    
    function cleanup(dat1, dat2) {
      console.log('about to segfault')
      dat1.destroy(function(err) {
        if (err) throw err

        dat2.destroy(function(err) {
          if (err) throw err
          t.end()
        })
      })
    }
    
  })
}


module.exports.all = function (test, common) {
  module.exports.clone(test, common)
}