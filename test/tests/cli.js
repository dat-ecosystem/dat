var os = require('os')
var fs = require('fs')
var path = require('path')
var concat = require('concat-stream')
var child = require('child_process')
var mkdirp = require('mkdirp')
var ldj = require('ldjson-stream')
var stdout = require('stdout')
var request = require('request')
var winSpawn = require('win-spawn')
var through = require('through2')
var kill = require('tree-kill')
var rimraf = require('rimraf')

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
        
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var gotError = output.indexOf('You are not in a dat folder') > -1
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
          var dat2 = spawn(datCliPath, ['listen', '9000'], {cwd: common.dat1tmp, env: process.env})
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
        var dat = spawn(datCliPath, ['clone', 'localhost:9999'], {cwd: path.join(common.dat1tmp, '..'), env: process.env})
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

module.exports.all = function (test, common) {
  module.exports.spawn(test, common)
  module.exports.noArgs(test, common)
  module.exports.init(test, common)
  module.exports.listen(test, common)
  module.exports.listenEmptyDir(test, common)
  module.exports.listenPort(test, common)
  module.exports.importCSV(test, common)
  module.exports.badCommand(test, common)
  module.exports.clone(test, common)
  module.exports.cloneDir(test, common)
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
