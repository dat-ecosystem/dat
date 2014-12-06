var request = require('request').defaults({json: true})
var parallel = require('run-parallel')
var concat = require('concat-stream')
var ldj = require('ndjson')
var csv = require('csv-parser')
var fs = require('fs')
var path = require('path')

module.exports.restHello = function(test, common) {
  test('rest get /api returns metadata', function(t) {
    if (common.rpc) return t.end()
    var opts = {
      name: 'imatestdat',
      description: 'This is a description',
      publisher: 'cat@imadat.com'
    }
    var datPath = path.join(common.dat1tmp, 'dat.json')
    fs.mkdirSync(common.dat1tmp)
    fs.writeFile(datPath, JSON.stringify(opts), function (err) {
      if (err) throw err
      common.getDat(t, function(dat, cleanup) {
        dat.put({foo: 'bar'}, function(err, stored) {
          if (err) throw err
          request('http://localhost:' + dat.options.port + '/api', function(err, res, json) {
            t.false(err, 'no error')
            verify(json)
            cleanup()
          })

          function verify(json) {
            t.ok(json.dat, 'has .dat')
            t.ok(json.version, 'has .version')
            t.equal(json.changes, 2, 'has 2 changes')
            t.equal(json.rows, 1, 'has 1 row')
            t.equal(json.name, opts.name, 'has a name')
            t.equal(json.publisher, opts.publisher, 'has a publisher')
            t.equal(json.description, opts.description, 'has a description')
            t.ok(json.approximateSize.rows, 'has approximate doc size')
          }
        })
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
        request('http://localhost:' + dat.options.port + '/api/rows/' + stored.key, function(err, res, json) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
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
      request({method: 'HEAD', uri: 'http://localhost:' + dat.options.port + '/api/blobs/abc123'}, function(err, res, stored) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
        t.notOk(err, 'no POST err')
        var uploadUrl = 'http://localhost:' + dat.options.port + '/api/rows/foo/data.txt?version=' + stored.version
        var post = request({method: 'POST', uri: uploadUrl, body: 'hello'}, function(err, res, updated) {
          t.notOk(err, 'no upload err')
          t.ok(updated.version, 2, 'version 2')
          var blobMeta = updated.blobs['data.txt']
          request({method: 'GET', uri: 'http://localhost:' + dat.options.port + '/api/blobs/' + blobMeta.key}, function(err, res, blob) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, json) {
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
      request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
        t.notOk(err, 'no POST err')
        var uploadUrl = 'http://localhost:' + dat.options.port + '/api/rows/foo/data.txt?version=' + stored.version
        var post = request({method: 'POST', uri: uploadUrl, body: 'hello'}, function(err, res, updated) {
          t.notOk(err, 'no upload err')
          t.ok(updated.version, 2, 'version 2')
          request('http://localhost:' + dat.options.port + '/api/rows/foo/data.txt', function(err, resp, blob) {
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
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
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
      var opts = {method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', body: 'a,b,c\n1,2,3\n4,5,6'}
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
      var opts = {method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', body: 'a,b,c\n1,2,3\n4,5,6'}
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
      request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
        if (err) throw err
        t.equal(res.statusCode, 401, 'unauthorized')
        request({method: 'POST', uri: 'http://user:pass@localhost:' + dat.options.port + '/api/rows', json: body }, function(err, res, stored) {
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
      var headers = {"content-type": "application/json"}
      
      parallel([
        function(cb) {
          request({method: 'POST', uri: 'http://foo:bar@localhost:' + dat.options.port + '/api/rows', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 201, 'authorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/session', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/login', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rows/foo/bar.jpg', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/rpc', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        },
        function(cb) {
          request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/push', json: body, headers: headers }, function(err, res, stored) {
            if (err) throw err
            t.equal(res.statusCode, 401, 'unauthorized')
            cb()
          })
        }
      ], function(err) {
        cleanup()
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
      request({uri: 'http://localhost:' + dat.options.port + '/api/session', headers: headers, json: true }, function(err, res, json) {
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
      request({uri: 'http://localhost:' + dat.options.port + '/api/session', headers: headers, json: true }, function(err, res, json) {
        if (err) throw err
        t.equal(res.statusCode, 200, '200 OK')
        var sessionHeaders = {
          cookie: res.headers['set-cookie']
        }
        request({uri: 'http://localhost:' + dat.options.port + '/api/logout', headers: sessionHeaders, json: true}, function(err, res, json) {
          t.equal(res.statusCode, 401, '401 Unauthorized')
          t.ok(res.headers['set-cookie'], 'got set-cookie header')
          t.ok(json.loggedOut, 'got loggedOut in response')
          request({uri: 'http://localhost:' + dat.options.port + '/api/session', headers: sessionHeaders, json: true}, function(err, res, json) {
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
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          request({uri: 'http://localhost:' + dat.options.port + '/api/csv'}, function(err, res, csv) {
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
  test('GET /api/rows returns json object with rows', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          // json: false, because request will set accept headers otherwise and we want to check defaults
          request({uri: 'http://localhost:' + dat.options.port + '/api/rows', json: false}, function(err, res, data) {
            if (err) throw err
            var json
            try { json = JSON.parse(data) } 
            catch(e) { t.fail('json parsing error') }
            t.equal(json.rows.length, 2, '2 objects returned')
            t.equal(json.rows[0]['a'], '1', 'data matches')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.jsonExportFormats = function (test, common) {
  test('GET /api/rows format tests', function (t) {
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      function commonFormatTest(cb, type, rows) {
        t.equal(rows.length, 2, type + ', 2 objects returned')
        t.equal(rows[0]['a'], '1', type + ', data matches')
        cb()
      }
      
      function sseTest(cb, msg, err, res, body) {
        if(err) throw err
        var chunks = body.split('\n\n').slice(0, 2)
        t.ok(chunks.every(function (chunk) {
          return chunk.slice(0, 'event: data'.length) === 'event: data'
        }), 'format=sse, correct sse message headers')
        var rows = chunks.map(function (chunk) {
          return JSON.parse(chunk.slice('event: data\ndata: '.length))
        })
        commonFormatTest(cb, msg, rows)
      }
      
      post.on('response', function (resp) {
        resp.on('end', function () {
          parallel([
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows?format=json', json: true}, function(err, res, json) {
                if (err) throw err
                commonFormatTest(cb, 'format=json', json.rows)
              })
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows', headers: {'Accept': 'application/json'} ,json: true}, function(err, res, json) {
                if (err) throw err
                commonFormatTest(cb, 'accept:application/json', json.rows)
              })
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows?format=json&style=array', json: true}, function(err, res, json) {
                if (err) throw err
                commonFormatTest(cb, 'format=json&style=array', json)
              })
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows?format=csv'})
                .pipe(csv())
                .pipe(concat(commonFormatTest.bind(null, cb, 'format=csv')))
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows', headers: {'Accept': 'text/csv'}})
                .pipe(csv())
                .pipe(concat(commonFormatTest.bind(null, cb, 'accept:text/csv')))
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows?format=ndjson'})
                .pipe(ldj.parse())
                .pipe(concat(commonFormatTest.bind(null, cb, 'format=ndjson')))
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows?format=sse'}, sseTest.bind(null, cb, 'format=sse'))
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/rows', headers: {'Accept': 'text/event-stream'}}, 
                sseTest.bind(null, cb, 'accept:text/event-stream'))
            }
            ], function (err) {
              cleanup()
            })
        })
      })
    })
  })
}

module.exports.jsonExportLimit = function(test, common) {
  test('GET /api/rows?limit=1 returns 1 row', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          request({uri: 'http://localhost:' + dat.options.port + '/api/rows?limit=1', json: true}, function(err, res, json) {
            if (err) throw err
            t.equal(json.rows.length, 1, '1 object returned')
            t.equal(json.rows[0]['a'], '1', 'data matches')
            cleanup()
          })
        })
      })
    })
  })
}

module.exports.changes = function(test, common) {
  test('GET /api/changes various requests', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
      post.write('a,b,c\n')
      post.write('1,2,3\n')
      post.write('4,5,6')
      post.end()
      
      post.on('response', function(resp) {
        resp.on('end', function() {
          
          parallel([
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes', json: false}, function (err, res, data) {
                if(err) throw err
                var json
                try { json = JSON.parse(data) } 
                catch(e) { t.fail('json parsing error') }
                var rows = json.rows
                t.equal(rows.length, 3, '3 objects returned') // 2 docs + 1 schema
                t.ok(rows[0].key, 'row 1 has a key')
                t.ok(rows[1].key, 'row 2 has a key')
                t.ok(rows[2].key, 'row 3 has a key')
                cb()
              })

            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true', json: true}, function (err, res, json) {
                if(err) throw err
                formatTest(cb, 'style=object (default)', json.rows)
              })
            },
            function (cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true&style=array', json: true}, function (err, res, rows) {
                if(err) throw err
                formatTest(cb, 'style=array', rows)
              })
            },
            function(cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?format=csv'})
                .pipe(csv())
                .pipe(concat(function (rows) {
                    // not testing values because csv-write-stream doesn't support
                    // objects as keys yet
                    t.equal(rows.length, 3, 'format=csv, 3 objects returned') // 2 docs + 1 schema
                    t.ok(rows[0].key, 'format=csv, row 1 has a key')
                  cb()
                }))
            },
            function(cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true&format=ndjson'})
                .pipe(ldj.parse())
                .pipe(concat(formatTest.bind(null, cb, 'format=ndjson')))
            },
            function(cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true&style=newline'})
                .pipe(ldj.parse())
                .pipe(concat(formatTest.bind(null, cb, 'style=newline (legacy)')))
            },
            function(cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true&format=sse'})
                .pipe(concat(sseTest.bind(null, cb, 'format=sse')))
            },
            function(cb) {
              request({uri: 'http://localhost:' + dat.options.port + '/api/changes?tail=1&data=true&style=sse'})
                .pipe(concat(sseTest.bind(null, cb, 'style=sse (legacy)')))
            }
            ], function (err) {
              cleanup()
            })
            
          
          function formatTest(cb, type, rows) {
            t.equal(rows.length, 1, type + ', 1 object returned') // latest doc
            t.equal(rows[0].value.a, '4', type + ', row 1 is correct')
            cb()
          }

          function sseTest(cb, type, sse) {
            var lines = sse.toString().split('\n')
            t.equal(lines[0], 'event: data', type + ', correct event')
            var row = JSON.parse(lines[1].slice('data: '.length))
            t.equal(row.value.a, '4', type + ', row 1 is correct')
            cb()
          }

        })
      })
    })
  })
  
  
}

module.exports.changesLiveTail = function(test, common) {
  test('GET /api/changes?tail=true&live=true&data=true returns only new data and switches to ndjson', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      
      function insert(data, cb) {
        var headers = {'content-type': 'text/csv'}
        var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
        post.write(data)
        post.end()
        post.on('response', function(resp) {
          resp.on('end', cb)
        })
      }
      var rows = []
      insert('key,name\n1,bob\n2,sue', function() {
        var changeReq = request({uri: 'http://localhost:' + dat.options.port + '/api/changes?live=true&tail=true&data=true'})
        changeReq.pipe(ldj.parse()).on('data', function (row) {
          rows.push(row)
          if(rows.length === 2) collect(rows)
          if(rows.length > 2) t.fail('more than 2 objects returned')
        })
        insert('key,name\n3,bill\n4,sally', function() {
          setTimeout(function() {
            changeReq.abort()
          }, 500)
        })
      })
      
      function collect(rows) {
        t.ok(rows[0].key, 'row 1 has a key')
        t.equal(rows[0].value.name, 'bill', 'row 1 is bill')
        t.equal(rows[1].value.name, 'sally', 'row 2 is sally')
        cleanup()
      }
      
    })
  })
}

module.exports.pagination = function(test, common) {
  test('GET various pagination APIs', function(t) {
    if (common.rpc) return t.end()
    common.getDat(t, function(dat, cleanup) {
      var headers = {'content-type': 'text/csv'}
      var post = request({method: 'POST', uri: 'http://localhost:' + dat.options.port + '/api/bulk', headers: headers})
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
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?start=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'b', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?end=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?gt=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 1, '1 objects returned')
              t.equal(json.rows[0]['key'], 'c', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?gte=b', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'b', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?lt=c', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 2, '2 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?lte=c', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              t.equal(json.rows[0]['key'], 'a', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?reverse=true', json: true}, function(err, res, json) {
              if (err) throw err
              t.equal(json.rows.length, 3, '3 objects returned')
              t.equal(json.rows[0]['key'], 'c', 'data matches')
              cb()
            })
          },
          function(cb) {
            request({uri: 'http://localhost:' + dat.options.port + '/api/rows?reverse=true&lt=c', json: true}, function(err, res, json) {
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
  module.exports.jsonExportFormats(test, common)
  module.exports.jsonExportLimit(test, common)
  module.exports.changes(test, common)
  module.exports.changesLiveTail(test, common)
  module.exports.pagination(test, common)
}
