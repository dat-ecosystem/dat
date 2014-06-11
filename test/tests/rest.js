var request = require('request').defaults({json: true})
var concat = require('concat-stream')

module.exports.restHello = function(test, common) {
  test('rest get /api returns stats', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      dat.put({foo: 'bar'}, function(err, stored) {
        if (err) throw err
        request('http://localhost:' + dat.defaultPort + '/api', function(err, res, json) {
          t.false(err, 'no error')
          verify(json)
          cleanup()
        })
        
        function verify(json) {
          t.ok(json.dat, 'has .dat')
          t.ok(json.version, 'has .version')
          t.equal(json.changes, 1, 'has 1 change')
          t.equal(json.rows, 1, 'has 1 row')
          t.ok(json.approximateSize.documents, 'has approximate doc size')
        }
      })
    })
  })
}

module.exports.restGet = function(test, common) {
  test('rest get', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      dat.put({foo: 'bar'}, function(err, stored) {
        if (err) throw err
        request('http://localhost:' + dat.defaultPort + '/api/' + stored.key, function(err, res, json) {
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
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
        if (err) throw err
        dat.get(stored.key, function(err, json) {
          t.false(err, 'no error')
          t.deepEqual(stored, json)
          cleanup()
        })
      })
    })
  })
}

module.exports.restConflict = function(test, common) {
  test('rest conflict', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var body = {key: 'foo'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
        if (err) throw err
        request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, json) {
          t.equal(res.statusCode, 409, '409')
          t.false(err, 'no req error')
          t.ok(json.conflict, 'body.conflict')
          cleanup()
        })
      })
    })
  })
}

module.exports.restPutBlob = function(test, common) {
  test('rest put blob', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var body = {key: 'foo'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
        t.notOk(err, 'no POST err')
        var uploadUrl = 'http://localhost:' + dat.defaultPort + '/api/foo/data.txt?version=' + stored.version
        var post = request({method: 'POST', uri: uploadUrl, body: 'hello'}, function(err, res, updated) {
          t.notOk(err, 'no upload err')
          t.ok(updated.version, 2, 'version 2')
          request('http://localhost:' + dat.defaultPort + '/api/foo/data.txt', function(err, resp, attachment) {
            t.notOk(err, 'no get err')
            t.equals(attachment.toString(), 'hello', 'got data.txt')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.restBulkCsv = function(test, common) {
  test('rest bulk post csv', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3')
      post.end()
      post.pipe(concat(function(resp) {
        var ldj = resp.toString()
        ldj = ldj.slice(0, ldj.length - 1)
        var obj = ldj.split('\n').map(function(o) { return JSON.parse(o) })[0]
        
        dat.get(obj.key, function(err, json) {
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
    if (common.rpc) return t.end()
    process.env['DAT_ADMIN_USER'] = 'user'
    process.env['DAT_ADMIN_PASS'] = 'pass'
    common.getDat(t, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://user:pass@localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
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
    if (common.rpc) return t.end()
    var opts = { adminUser: 'foo', adminPass: 'bar' }
    common.getDat(t, opts, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://foo:bar@localhost:' + dat.defaultPort + '/api', json: body }, function(err, res, stored) {
          if (err) throw err
          t.equal(res.statusCode, 200, 'authorized')
          cleanup()
        })
      })
    })
  })
}

module.exports.createSession = function(test, common) {
  test('create a session w/ basic auth', function(t) {
    if (common.rpc) return t.end()
    var opts = { adminUser: 'foo', adminPass: 'bar' }
    common.getDat(t, opts, function(dat, cleanup) {
      var headers = {
        authorization: 'Basic ' + new Buffer('foo:bar').toString('base64')
      }
      request({uri: 'http://localhost:' + dat.defaultPort + '/api/session', headers: headers, json: true }, function(err, res, json) {
        if (err) throw err
        t.equal(res.statusCode, 200, '200 OK')
        t.ok(res.headers['set-cookie'], 'got set-cookie header')
        t.ok(json.session, 'got session in response')
        cleanup()
      })
    })
  })
}

module.exports.logout = function(test, common) {
  test('logout of a session', function(t) {
    if (common.rpc) return t.end()
    var opts = { adminUser: 'foo', adminPass: 'bar' }
    common.getDat(t, opts, function(dat, cleanup) {
      var headers = {
        authorization: 'Basic ' + new Buffer('foo:bar').toString('base64')
      }
      request({uri: 'http://localhost:' + dat.defaultPort + '/api/session', headers: headers, json: true }, function(err, res, json) {
        if (err) throw err
        t.equal(res.statusCode, 200, '200 OK')
        var sessionHeaders = {
          cookie: res.headers['set-cookie']
        }
        request({uri: 'http://localhost:' + dat.defaultPort + '/api/logout', headers: sessionHeaders, json: true}, function(err, res, json) {
          t.equal(res.statusCode, 401, '401 Unauthorized')
          t.ok(res.headers['set-cookie'], 'got set-cookie header')
          t.ok(json.loggedOut, 'got loggedOut in response')
          request({uri: 'http://localhost:' + dat.defaultPort + '/api/session', headers: sessionHeaders, json: true}, function(err, res, json) {
            t.equal(res.statusCode, 401, '401 Unauthorized')
            t.ok(res.headers['set-cookie'], 'got set-cookie header')
            t.ok(json.loggedOut, 'got loggedOut in response')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.csvExport = function(test, common) {
  test('GET /api/csv returns proper csv', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/csv'}, function(err, res, csv) {
            if (err) throw err
            var lines = csv.split('\n')
            t.equal(lines[0].split(',').length, 5, '5 columns (key, version, a, b, c)')
            t.equal(lines.length, 4, '4 rows')
            t.equal(lines[lines.length - 1], '', '4th row is empty')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.jsonExport = function(test, common) {
  test('GET /api/json returns json array', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/json', json: true}, function(err, res, json) {
            if (err) throw err
            t.equal(json.rows.length, 2, '3 objects returned')
            t.equal(json.rows[0]['a'], '1', 'data matches')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.restHello(test, common)
  module.exports.restGet(test, common)
  module.exports.restPut(test, common)
  module.exports.restConflict(test, common)
  module.exports.restPutBlob(test, common)
  module.exports.restBulkCsv(test, common)
  module.exports.basicAuthEnvVariables(test, common)
  module.exports.basicAuthOptions(test, common)
  module.exports.createSession(test, common)
  module.exports.logout(test, common)
  module.exports.csvExport(test, common)
  module.exports.jsonExport(test, common)
}
