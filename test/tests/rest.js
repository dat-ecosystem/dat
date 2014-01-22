var request = require('request').defaults({json: true})
var concat = require('concat-stream')

module.exports.restGet = function(test, common) {
  test('rest get', function(t) {
    common.getDat(t, function(dat, cleanup) {
      dat.put({foo: 'bar'}, function(err, stored) {
        if (err) throw err
        request('http://localhost:' + dat.defaultPort + '/' + stored._id, function(err, res, json) {
          t.false(err, 'no error')
          t.deepEqual(stored, json)
          cleanup()
        })
      })
    })
  })
}


module.exports.restPut = function(test, common) {
  test('rest put', function(t) {
    common.getDat(t, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort, json: body }, function(err, res, stored) {
        if (err) throw err
        dat.get(stored._id, function(err, json) {
          t.false(err, 'no error')
          t.deepEqual(stored, json)
          cleanup()
        })
      })
    })
  })
}


module.exports.restBulkCsv = function(test, common) {
  test('rest bulk post csv', function(t) {
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/_bulk', headers: headers})
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
          cleanup()
        })
      }))
    })
  })
}

module.exports.basicAuthEnvVariables = function(test, common) {
  test('basic auth through env variables', function(t) {
    process.env['DAT_ADMIN_USER'] = 'user'
    process.env['DAT_ADMIN_PASS'] = 'pass'
    common.getDat(t, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort, json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://user:pass@localhost:' + dat.defaultPort, json: body }, function(err, res, stored) {
          if (err) throw err
          t.equal(res.statusCode, 200, 'authorized')
          delete process.env['DAT_ADMIN_USER']
          delete process.env['DAT_ADMIN_PASS']
          cleanup()
        })
      })
    })
  })
}

module.exports.basicAuthOptions = function(test, common) {
  test('basic auth through dat options', function(t) {
    var opts = { adminUser: 'foo', adminPass: 'bar' }
    common.getDat(t, opts, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort, json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://foo:bar@localhost:' + dat.defaultPort, json: body }, function(err, res, stored) {
          if (err) throw err
          t.equal(res.statusCode, 200, 'authorized')
          cleanup()
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.restGet(test, common)
  module.exports.restPut(test, common)
  module.exports.restBulkCsv(test, common)
  module.exports.basicAuthEnvVariables(test, common)
  module.exports.basicAuthOptions(test, common)
}
