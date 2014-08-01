var request = require('request').defaults({json: true})
var parallel = require('run-parallel')
var concat = require('concat-stream')

module.exports.restHello = function(test, common) {
  test('rest get /api returns metadata', function(t) {
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
          t.ok(json.approximateSize.rows, 'has approximate doc size')
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
        request('http://localhost:' + dat.defaultPort + '/api/rows/' + stored.key, function(err, res, json) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 201, 'got 201')
        dat.get(stored.key, function(err, json) {
          t.false(err, 'no error')
          t.deepEqual(stored, json)
          cleanup()
        })
      })
    })
  })
}

module.exports.restBlobExists = function(test, common) {
  test('rest blob exists', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var body = {foo: 'bar'}
      request({method: 'HEAD', uri: 'http://localhost:' + dat.defaultPort + '/api/blobs/abc123'}, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 404, 'got 404')
        cleanup()
      })
    })
  })
}

module.exports.restGetBlobByHash = function(test, common) {
  test('rest get blob by hash', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var body = {key: 'foo'}
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        t.notOk(err, 'no POST err')
        var uploadUrl = 'http://localhost:' + dat.defaultPort + '/api/rows/foo/data.txt?version=' + stored.version
        var post = request({method: 'POST', uri: uploadUrl, body: 'hello'}, function(err, res, updated) {
          t.notOk(err, 'no upload err')
          t.ok(updated.version, 2, 'version 2')
          var blobMeta = updated.blobs['data.txt']
          request({method: 'GET', uri: 'http://localhost:' + dat.defaultPort + '/api/blobs/' + blobMeta.hash}, function(err, res, blob) {
            if (err) throw err
            t.equal(blobMeta.size, blob.length, 'size matches')
            cleanup()
          })
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
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, json) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        t.notOk(err, 'no POST err')
        var uploadUrl = 'http://localhost:' + dat.defaultPort + '/api/rows/foo/data.txt?version=' + stored.version
        var post = request({method: 'POST', uri: uploadUrl, body: 'hello'}, function(err, res, updated) {
          t.notOk(err, 'no upload err')
          t.ok(updated.version, 2, 'version 2')
          request('http://localhost:' + dat.defaultPort + '/api/rows/foo/data.txt', function(err, resp, blob) {
            t.notOk(err, 'no get err')
            t.equals(blob.toString(), 'hello', 'got data.txt')
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

module.exports.restBulkCsvInvalidContentType = function(test, common) {
  test('rest bulk post csv w/ invalid content-type', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var opts = {method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', body: 'a,b,c\n1,2,3\n4,5,6'}
      request(opts, function(err, resp, json) {
        t.equal(resp.statusCode, 400, 'got 400')
        cleanup()
      })
    })
  })
}

module.exports.restBulkCsvSchemaError = function(test, common) {
  test('rest bulk post csv w/ invalid schema', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var opts = {method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', body: 'a,b,c\n1,2,3\n4,5,6'}
      opts.headers = {'content-type': 'text/csv'}
      request(opts, function(err, resp, json) {
        t.equal(resp.statusCode, 200, 'got 200')
        opts.body = 'foo,bar,baz\n1,2,3\n4,5,6'
        request(opts, function(err, resp, json) {
          t.equal(resp.statusCode, 400, 'got 400')
          t.ok(json.message.match('mismatch'), 'column mismatch')
          cleanup()
        })
      })
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
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://user:pass@localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
          if (err) throw err
          t.equal(res.statusCode, 201, 'authorized')
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
      request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://foo:bar@localhost:' + dat.defaultPort + '/api/rows', json: body }, function(err, res, stored) {
          if (err) throw err
          t.equal(res.statusCode, 201, 'authorized')
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
          request({uri: 'http://localhost:' + dat.defaultPort + '/api/csv'}, function(err, res, csv) {
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
  test('GET /api/rows returns json array', function(t) {
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
          request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: true}, function(err, res, json) {
            if (err) throw err
            t.equal(json.rows.length, 2, '2 objects returned')
            t.equal(json.rows[0]['a'], '1', 'data matches')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.pagination = function(test, common) {
  test('GET various pagination APIs', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.defaultPort + '/api/bulk', headers: headers})
      post.write('key,a,b\n')
      post.write('a,1,4\n')
      post.write('b,2,5\n')
      post.write('c,3,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', run)
      })
      
      function run() {
        parallel([
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?start=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'b', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?end=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?gt=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 1, '1 objects returned')
              t.equal(json.rows[0]['key'], 'c', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?gte=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'b', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?lt=c', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?lte=c', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?reverse=true', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              t.equal(json.rows[0]['key'], 'c', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.defaultPort + '/api/rows?reverse=true&lt=c', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'b', 'data matches')
              cb()
            })
          }
        ], function(err) {
          cleanup()
        })
        
      }
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.restHello(test, common)
  module.exports.restGet(test, common)
  module.exports.restPut(test, common)
  module.exports.restConflict(test, common)
  module.exports.restPutBlob(test, common)
  module.exports.restBlobExists(test, common)
  module.exports.restGetBlobByHash(test, common)
  module.exports.restBulkCsv(test, common)
  module.exports.restBulkCsvInvalidContentType(test, common)
  module.exports.restBulkCsvSchemaError(test, common)
  module.exports.basicAuthEnvVariables(test, common)
  module.exports.basicAuthOptions(test, common)
  module.exports.createSession(test, common)
  module.exports.logout(test, common)
  module.exports.csvExport(test, common)
  module.exports.jsonExport(test, common)
  module.exports.pagination(test, common)
}
