var request = require('request').defaults({json: true})
var parallel = require('run-parallel')
var concat = require('concat-stream')

module.exports.rest = function(test, common) {
  test('collects rest stats', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var statsStream = dat.createStatsStream().pipe(concat(function(stats) {
        var totals = sumStats(stats)
        t.equal(totals.http.read, 50)
        t.equal(totals.http.written, 50)
        cleanup()
      }))
      
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        request({uri: 'http://localhost:' + dat.defaultPort + '/api/json', json: true}, function(err, res, json) {
          if (err) throw err
          t.equal(json.rows.length, 3, '3 objects returned')
          setTimeout(function() {
            statsStream.end()
          }, 1000)
        })
      })

    })
  })
}

module.exports.all = function (test, common) {
  module.exports.rest(test, common)
}

function sumStats(stats) {
  var total = {
    http: {
      written: 0,
      read: 0
    },
    level: {
      written: 0,
      read: 0,
      get: 0,
      put: 0,
      del: 0
    },
    blobs: {
      written: 0,
      read: 0
    }
  }
  
  stats.map(function(stat) {
    total.http.written += stat.http.written
    total.level.written += stat.level.written
    total.blobs.written += stat.blobs.written
    total.http.read += stat.http.read
    total.level.read += stat.level.read
    total.blobs.read += stat.level.read
    total.level.get += stat.level.get
    total.level.put += stat.level.put
    total.level.del += stat.level.del
  })

  return total
}
