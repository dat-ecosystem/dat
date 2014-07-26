var os = require('os')
var fs = require('fs')
var path = require('path')
var concat = require('concat-stream')
var child = require('child_process')
var mkdirp = require('mkdirp')
var ldj = require('ldjson-stream')
var stdout = require('stdout')
var request = require('request')
var spawn = require('win-spawn')
var through = require('through2')
var kill = require('tree-kill')

var nodeCmd = process.execPath
var timeout = 6000
if (os.platform().match(/^win/)) {
  nodeCmd = 'node.exe'
  timeout = 20000
}
var datCliPath =  path.resolve(__dirname, '..', '..', 'cli.js')
var datCmd = '"' + nodeCmd + '" "' + datCliPath + '"'

module.exports.init = function(test, common) {
  test('CLI dat init', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(nodeCmd, [datCliPath, 'init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var success = (output.indexOf('Initialized dat store') > -1)
          if (!success) console.error(output)
          t.ok(success, 'output matches')
          var port = fs.existsSync(path.join(common.dat1tmp, '.dat', 'PORT'))
          t.false(port, 'should have no PORT file')
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
        var dat = spawn(nodeCmd, [datCliPath, 'init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var dat2 = spawn(nodeCmd, [datCliPath, 'listen'], {cwd: common.dat1tmp, env: process.env})
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

module.exports.listenPort = function(test, common) {
  test('CLI dat listen custom port', function(t) {
    if (common.rpc) return t.end()
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = spawn(nodeCmd, [datCliPath, 'init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
        getFirstOutput(dat.stdout, verify)
        
        function verify(output) {
          var dat2 = spawn(nodeCmd, [datCliPath, 'listen', '9000'], {cwd: common.dat1tmp, env: process.env})
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
          child.exec(cmd, {timeout: 20000, cwd: common.dat1tmp}, done)
          
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
          
          var dat = spawn(nodeCmd, [datCliPath, 'pizza'], {cwd: common.dat1tmp, env: process.env})
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
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        initDat({cwd: common.dat1tmp, timeout: timeout, rpc: common.rpc}, function(cleanup) {
          
          
          var dat = spawn(nodeCmd, [datCliPath, 'clone', 'localhost:9999'], {cwd: common.dat1tmp, env: process.env})
          getFirstOutput(dat.stderr, verify)
          
          function verify(output) {
            t.ok(output.indexOf('ECONNREFUSED') > -1, 'got ECONNREFUSED')
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

module.exports.all = function (test, common) {
  module.exports.init(test, common)
  module.exports.listen(test, common)
  module.exports.listenPort(test, common)
  module.exports.importCSV(test, common)
  module.exports.badCommand(test, common)
  module.exports.clone(test, common)
}

function initDat(opts, cb) {
  child.exec(datCmd + ' init --no-prompt', opts, function (error, stdo, stde) {
    if (error || stdo.indexOf('Initialized dat store') === -1) {
      throw error || stdo.toString()
    }
    
    // dont serve when in rpc mode
    if (!opts.rpc) return done()
    
    var server = spawn(nodeCmd, [datCliPath, 'listen'], opts)
    if (process.env.DEBUG) server.stdout.pipe(stdout('rpc server stdout: '))
    if (process.env.DEBUG) server.stderr.pipe(stdout('rpc server stderr: '))
    
    setTimeout(done, timeout)
    
    function done(){
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
    if (ch.length > 0 || !done) {
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
