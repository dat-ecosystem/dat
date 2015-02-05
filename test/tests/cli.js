var os = require('os')
var fs = require('fs')
var path = require('path')
var concat = require('concat-stream')
var child = require('child_process')
var mkdirp = require('mkdirp')
var ldj = require('ndjson')
var stdout = require('stdout')
var request = require('request')
var winSpawn = require('win-spawn')
var through = require('through2')
var kill = require('tree-kill')
var rimraf = require('rimraf')
var runSerially = require('run-series')
var split = require('split')

var nodeCmd = process.execPath
var timeout = 20000
var datCliPath =  path.resolve(__dirname, '..', '..', 'cli.js')
var datCmd = '"' + nodeCmd + '" "' + datCliPath + '"'

module.exports.spawn = function(test, common) {
  test('test that spawning processes works', function(t) {
    var proc = spawn(process.execPath, ['-v'])
    getFirstOutput(proc.stdout, function(out) {
      t.ok(out.indexOf(process.version) > -1, process.version)
      kill(proc.pid)
      t.end()
    })
  })
}

module.exports.noArgs = function(test, common) {
  test('CLI dat w/ no args', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, [], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stderr, verify)
        
        function verify(output) {
          var success = (output.indexOf('Usage') > -1)
          if (!success) console.log(['output:', output])
          t.ok(success, 'output matches')
          kill(dat.pid)
          common.destroyTmpDats(function() {
            t.end()
          })
        }
        
      })
    })
  })
}

module.exports.init = function(test, common) {
  test('CLI dat init', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        dat.on('exit', function (code, signal) {
          t.equals(code, 0, 'init exits with code 0')
        })
        getFirstOutput(dat.stdout, verify)

        function verify(output) {
          var success = (output.indexOf('Initialized dat store') > -1)
          if (!success) console.log(['output:', output])
          t.ok(success, 'output matches')
          var port = fs.existsSync(path.join(common.dat1tmp, '.dat', 'PORT'))
          t.false(port, 'should have no PORT file')
          kill(dat.pid)
          common.destroyTmpDats(function() {
            t.end()
          })
        }
        
      })
    })
  })
}

module.exports.listen = function(test, common) {
  test('CLI dat listen', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var dat2 = spawn(datCliPath, ['listen'], {cwd: common.dat1tmp, env: process.env})
          getFirstOutput(dat2.stdout, verify2)
          
          function verify2(output2) {
            request({url: 'http://localhost:6461/api', json: true}, function(err, resp, json) {
              t.ok(json && !!json.version, 'got json response')
              kill(dat.pid)
              kill(dat2.pid)
              common.destroyTmpDats(function() {
                t.end()
              })
            })
          }
        }
      })
    })
  })
}

module.exports.listenEmptyDir = function(test, common) {
  test('CLI dat listen in empty dir (not a dat dir)', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, ['listen'], {cwd: common.dat1tmp})
        
        getFirstOutput(dat.stderr, verify)
        
        function verify(output) {
          var gotError = output.indexOf('There is no dat here') > -1
          t.ok(gotError, 'got error')
          if (!gotError) console.log('Output:', output)
          kill(dat.pid)
          common.destroyTmpDats(function() {
            t.end()
          })
        }
      })
    })
  })
}

module.exports.listenPort = function(test, common) {
  test('CLI dat listen custom port', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var dat2 = spawn(datCliPath, ['listen', '--port=9000'], {cwd: common.dat1tmp, env: process.env})
          getFirstOutput(dat2.stdout, verify2)
          
          function verify2(output2) {
            request({url: 'http://localhost:9000/api', json: true}, function(err, resp, json) {
              t.ok(json && !!json.version, 'got json response')
              kill(dat.pid)
              kill(dat2.pid)
              common.destroyTmpDats(function() {
                t.end()
              })
            })
          }
          
        }
      })
    })
  })
}

module.exports.importCSV = function(test, common) {
  test('CLI dat import csv', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          var testCsv = path.join(os.tmpdir(), 'test.csv')
          fs.writeFileSync(testCsv, 'a,b,c\n1,2,3\n4,5,6\n7,8,9')
          var cmd = datCmd + ' import "' + testCsv + '" --csv --quiet --results'
          child.exec(cmd, {timeout: timeout, cwd: common.dat1tmp}, done)
          
          function done(err, stdo, stde) {
            if (process.env.DEBUG) {
              process.stdout.write(stdo.toString())
              process.stdout.write(stde.toString())
            }
            
            t.notOk(err, 'no err')
            t.equals(stde.toString(), '', 'empty stderr')
            var lines = stdo.toString().split('\n')
            var rows = []
            lines.map(function(l) {
              if (l !== '') rows.push(JSON.parse(l))
            })
            t.equal(rows.length, 3)
            rows.map(function(r) { t.ok(r.key, 'row has key') })
            common.destroyTmpDats(function() {
              cleanup()
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.importCSVstdin = function(test, common) {
  test('CLI dat import csv from stdin', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          var cmd = datCmd + ' import --csv --quiet --results'
          var dat = child.exec(cmd, {timeout: timeout, cwd: common.dat1tmp}, done)
          dat.stdin.write('a,b,c\n1,2,3\n4,5,6\n7,8,9')
          dat.stdin.end()

          function done(err, stdo, stde) {
            if (process.env.DEBUG) {
              process.stdout.write(stdo.toString())
              process.stdout.write(stde.toString())
            }

            t.notOk(err, 'no err')
            t.equals(stde.toString(), '', 'empty stderr')
            var lines = stdo.toString().split('\n')
            var rows = []
            lines.map(function(l) {
              if (l !== '') rows.push(JSON.parse(l))
            })
            t.equal(rows.length, 3)
            rows.map(function(r) { t.ok(r.key, 'row has key') })
            common.destroyTmpDats(function() {
              cleanup()
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.importTSV = function(test, common) {
  test('CLI dat import tsv', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          var testTsv = path.join(os.tmpdir(), 'test.tsv')
          fs.writeFileSync(testTsv, 'a\tb\tc\n1\t2\t3\n4\t5\t6\n7\t8\t9')
          var cmd = datCmd + ' import "' + testTsv + '" --quiet --results'
          child.exec(cmd, {timeout: timeout, cwd: common.dat1tmp}, done)

          function done(err, stdo, stde) {
            if (process.env.DEBUG) {
              process.stdout.write(stdo.toString())
              process.stdout.write(stde.toString())
            }

            t.notOk(err, 'no err')
            t.equals(stde.toString(), '', 'empty stderr')
            var lines = stdo.toString().split('\n')
            var rows = []
            lines.map(function(l) {
              if (l !== '') rows.push(JSON.parse(l))
            })
            t.equal(rows.length, 3)
            rows.map(function(r) { t.ok(r.key, 'row has key') })
            common.destroyTmpDats(function() {
              cleanup()
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.importTSVstdin = function(test, common) {
  test('CLI dat import tsv from stdin', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          var cmd = datCmd + ' import --tsv --quiet --results'
          var dat = child.exec(cmd, {timeout: timeout, cwd: common.dat1tmp}, done)
          dat.stdin.write('a\tb\tc\n1\t2\t3\n4\t5\t6\n7\t8\t9')
          dat.stdin.end()

          function done(err, stdo, stde) {
            if (process.env.DEBUG) {
              process.stdout.write(stdo.toString())
              process.stdout.write(stde.toString())
            }

            t.notOk(err, 'no err')
            t.equals(stde.toString(), '', 'empty stderr')
            var lines = stdo.toString().split('\n')
            var rows = []
            lines.map(function(l) {
              if (l !== '') rows.push(JSON.parse(l))
            })
            t.equal(rows.length, 3)
            rows.map(function(r) { t.ok(r.key, 'row has key') })
            common.destroyTmpDats(function() {
              cleanup()
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.blobs = function(test, common) {
  test('CLI dat blobs get && dat blobs put', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        
        runSerially([
          function(cb) {
            var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, function(output) {
              var success = (output.indexOf('Initialized dat store') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              cb()
            })
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Usage: dat blobs') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'get', 'foo', 'dat.json'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Key not found') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'put', 'foo', '--name=pizza.jpg'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('using STDIN as input') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'put', 'foo', 'dat.json'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('Attached dat.json successfully to foo') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'get', 'foo', 'dat.json'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output[0] === '{')
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'put', 'foo', 'dat.json', '--name=dat2.json'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Conflict') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['blobs', 'put', 'foo', 'dat.json', '--name=dat2.json', '--version=1'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('Attached dat2.json successfully to foo') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          }
        ], function(err) {
          common.destroyTmpDats(function() {
            t.end()
          })
        })
                
      })
    })
  })
}

module.exports.rows = function(test, common) {
  test('CLI dat rows get && dat rows delete', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        
        runSerially([
          function(cb) {
            var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, function(output) {
              var success = (output.indexOf('Initialized dat store') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              cb()
            })
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Usage: dat rows') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'output matches')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['import', '--json'], {cwd: common.dat1tmp, env: process.env})
            dat.stdin.write('{"key": "food", "type": "bacon"}\n')
            dat.stdin.write('{"key": "food", "type": "pancake", "version": 2}')
            dat.stdin.end()
            dat.stderr.on('end', cb)
            dat.stderr.on('err', cb)
            
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'food'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('pancake') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'latest version')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'food', '1'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('bacon') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'version parameter')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'dessert'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Key not found') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'key does not exist')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'food', '3'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Key not found') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'version does not exist')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'delete'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Usage') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'rows delete usage')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'delete', 'notexisting'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Key not found') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'rows delete with nonexisting key')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'delete', 'food'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('marked as deleted') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'rows delete')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'food'], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stderr, verify)
        
            function verify(output) {
              var success = (output.indexOf('Key was deleted') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'key does not exist after deleting')
              kill(dat.pid)
              cb()
            }
          },
          function(cb) {
            var dat = spawn(datCliPath, ['rows', 'get', 'food', 1], {cwd: common.dat1tmp, env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              var success = (output.indexOf('bacon') > -1)
              if (!success) console.log(['output:', output])
              t.ok(success, 'old versions are not deleted')
              kill(dat.pid)
              cb()
            }
          }
        ], function(err) {
          common.destroyTmpDats(function() {
            t.end()
          })
        })
                
      })
    })
  })
}


module.exports.badCommand = function(test, common) {
  test('CLI dat command that doesnt exist', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          
          var dat = spawn(datCliPath, ['pizza'], {cwd: common.dat1tmp, env: process.env})
          getFirstOutput(dat.stderr, verify)
          
          function verify(output) {
            t.ok(output.indexOf('Command not found') > -1, 'output matches')
            kill(dat.pid)
            common.destroyTmpDats(function() {
              cleanup()
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.clone = function(test, common) {  
  test('CLI dat clone remote that isnt running', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(datCliPath, ['clone', 'localhost:9999', '--quiet'], {cwd: path.join(common.dat1tmp, '..'), env: process.env})
        getFirstOutput(dat.stderr, verify)
        function verify(output) {
          t.ok(output.indexOf('ECONNREFUSED') > -1, 'got ECONNREFUSED')
          
          kill(dat.pid)
          common.destroyTmpDats(function() {
            t.end()
          })
        }
      })
    })
  })
}

module.exports.cloneDir = function(test, common) {  
  test('CLI dat clone into specific dir', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          request({url: 'http://localhost:6461/api/rows', json: {'key': 'foo'}, method: 'POST'}, function(err, resp, json) {
            t.equal(json.version, 1, 'created row')
            
            var dat = spawn(datCliPath, ['clone', 'localhost:6461', 'pizza', '--quiet'], {cwd: path.join(common.dat1tmp, '..'), env: process.env})
            getFirstOutput(dat.stdout, verify)
        
            function verify(output) {
              t.equal(output, '', 'no output')
              
              cleanup()
              kill(dat.pid)
              common.destroyTmpDats(function() {
                var pizzaDir = path.join(common.dat1tmp, '..', 'pizza')
                t.ok(fs.existsSync(pizzaDir), 'pizza exists')
                
                var cat = spawn(datCliPath, ['cat'], {cwd: pizzaDir, env: process.env})
                getFirstOutput(cat.stdout, verifyCat)
        
                function verifyCat(output) {
                  t.ok(output.indexOf('{"key":"foo","version":1}') > -1, 'has foo')
                  kill(cat.pid)
                  rimraf(pizzaDir, function() {
                    t.end()
                  })
                }
              })
            }
          })
        })
      })
    })
  })
}

module.exports.cat = function (test, common) {
  test('CLI dat cat --live', function (t) {
    common.destroyTmpDats(function () {
      mkdirp(common.dat1tmp, function (err) {
        t.notOk(err)
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          var datImport = spawn(datCliPath, ['import', '-', '--results', '--json', '--quiet'], {cwd: common.dat1tmp, env: process.env})
          datImport.stdin.write('{"a": 1}\n')
          
          datImport.stdout.once('data', function () {
            var cat = spawn(datCliPath, ['cat', '--live'], {cwd: common.dat1tmp, env: process.env})
            var lineSplit = cat.stdout.pipe(split())
            lineSplit.once('data', function (chunk) {
              var row1 = JSON.parse(chunk)
              t.equals(row1.a, 1)
              t.equals(Object.keys(row1).length, 3)
              lineSplit.once('data', function (chunk) {
                var row2 = JSON.parse(chunk)
                t.equals(row2.a, 2)
                t.equals(Object.keys(row2).length, 3)
                kill(cat.pid)
                kill(datImport.pid)
                cleanup()
                common.destroyTmpDats(function () {
                  t.end()  
                })
              })
              datImport.stdin.write('{"a": 2}\n')
              datImport.stdin.end()
            })
            
          })
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.spawn(test, common)
  module.exports.noArgs(test, common)
  module.exports.init(test, common)
  module.exports.listen(test, common)
  module.exports.listenEmptyDir(test, common)
  module.exports.listenPort(test, common)
  module.exports.importCSV(test, common)
  module.exports.importCSVstdin(test, common)
  module.exports.importTSV(test, common)
  module.exports.importTSVstdin(test, common)
  module.exports.blobs(test, common)
  module.exports.rows(test, common)
  module.exports.badCommand(test, common)
  module.exports.clone(test, common)
  module.exports.cloneDir(test, common)
  module.exports.cat(test, common)
}

function initDat(opts, cb) {
  child.exec(datCmd + ' init --no-prompt', opts, function (error, stdo, stde) {
    if (error || stdo.indexOf('Initialized dat store') === -1) {
      throw error || stdo.toString()
    }
    
    // dont serve when in rpc mode
    if (opts.rpc) return done()
    
    var server = spawn(datCliPath, ['listen'], opts)
    
    getFirstOutput(server.stdout, function(output) {
      if (output.indexOf('Listening') > -1) return done()
      
      cleanup()
      throw new Error(output)
    })
    
    if (process.env.DEBUG) server.stdout.pipe(stdout('rpc server stdout: '))
    if (process.env.DEBUG) server.stderr.pipe(stdout('rpc server stderr: '))
    
    function done() {
      cb(cleanup)
    }
    
    function cleanup() {
      if (server) kill(server.pid)
    }
  })
}

function getFirstOutput(stream, cb) {
  var done = false
  stream.pipe(through(function(ch, enc, next) {
    if (ch.length > 0 && !done) {
      done = true
      cb(ch.toString())
    }
    next()
  }, function(next) {
    if (!done) {
      done = true
      cb("")
    }
    if (next) next()
  }))
}

function spawn(cmd, args, opts) {
  var proc = winSpawn(cmd, args, opts)
  if (process.env.DEBUG) {
    console.log('spawning:', cmd, args)
    proc.stdout.pipe(stdout('stdout: '))
    proc.stderr.pipe(stdout('stderr: '))
  }
  return proc
}
