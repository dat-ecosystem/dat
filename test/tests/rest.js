var request = require('request').defaults({json: true})
var concat = require('concat-stream')

module.exports.restGet = function(test, common) {
  test('rest get', function(t) {
    common.getDat(t, function(dat, cleanup) {
      dat.serve(function(err) {
        if (err) throw err
        dat.put({foo: 'bar'}, function(err, stored) {
          if (err) throw err
          request('http://localhost:6461/' + stored._id, function(err, res, json) {
            t.false(err, 'no error')
            t.deepEqual(stored, json)
            dat.close()
            cleanup()
          })
        })
      })
    })
  })
}


module.exports.restPut = function(test, common) {
  test('rest put', function(t) {
    common.getDat(t, function(dat, cleanup) {
      dat.serve(function(err) {
        if (err) throw err
        var body = {foo: 'bar'}
        request({method: 'POST', uri: 'http://localhost:6461', json: body }, function(err, res, stored) {
          if (err) throw err
          dat.get(stored._id, function(err, json) {
            t.false(err, 'no error')
            t.deepEqual(stored, json)
            dat.close()
            cleanup()
          })
        })
      })
    })
  })
}


module.exports.restBulkCsv = function(test, common) {
  test('rest bulk post csv', function(t) {
    common.getDat(t, function(dat, cleanup) {
      dat.serve(function(err) {
        if (err) throw err
        var headers = {'content-type': 'text/csv'}
        var post = request({method: 'POST', uri: 'http://localhost:6461/_bulk', headers: headers})
        post.write('a,b,c\n')
        post.write('1,2,3')
        post.end()
        post.pipe(concat(function(resp) {
          var ldj = resp.toString()
          ldj = ldj.slice(0, ldj.length - 1)
          var obj = ldj.split('\n').map(function(o) { return JSON.parse(o).row })[0]
          dat.get(obj._id, function(err, json) {
            t.false(err, 'no error')
            t.equal(json.a, '1', 'data matches')
            t.equal(json.b, '2', 'data matches')
            t.equal(json.c, '3', 'data matches')
            dat.close()
            cleanup()
          })
        }))
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.restGet(test, common)
  module.exports.restPut(test, common)
  module.exports.restBulkCsv(test, common)
}
