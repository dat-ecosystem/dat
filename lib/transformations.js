var ldjson = require('ndjson')
var duplexer = require('duplexer2')
var execspawn = require('execspawn')
var extend = require('extend')
var os = require('os')
var path = require('path')
var splicer = require('stream-splicer')
var resolve = require('resolve')
var stdout = require('stdout')
var debug = require('debug')('dat.transformations')
var debugStream = require('debug-stream')(debug)

var SEP = os.platform() === 'win32' ? ';' : ':'
var PATH = path.join('node_modules', '.bin') + SEP + process.env.PATH

module.exports = function(transforms) {
  transforms = transforms
    .map(normalize)
    .map(function(t, i) {
      debug('Registering transform #' + i, t)
      // TODO: support more formats
      if (typeof t === 'function') return t()
      if (typeof t.pipe === 'function') return t
      if (t.format !== 'json') throw new Error('Transform #'+i+' not a non supported format')
      if (t.command) return command(t)
      if (t.module)  return mod(t)

      throw new Error('Transform #'+i+' is not currently support')
    })

  return splicer.obj(transforms)
}

function mod(t) {
  var m = require(resolve.sync(t.module, {basedir:process.cwd()})) // require is sync so resolve.sync is ok
  return m(t)
}

function command(t) {
  var env = extend({}, process.env, {PATH:PATH})
  var proc = execspawn(t.command, {env:env})
  var dup = duplexer(proc.stdin, proc.stdout)

  proc.stderr.resume() // drain it!
  proc.unref()
  proc.stderr.unref()
  proc.stdout.unref()
  proc.stdin.unref()
  
  var serializer = ldjson.serialize()
  var parser = ldjson.parse()
  
  if (process.env.DEBUG) {
    serializer.pipe(debugStream('transform input: '))
    dup.pipe(debugStream('transform output: '))
  }
  
  return splicer.obj([serializer, dup, parser])
}

function normalize(t) {
  if (typeof t === 'string') t = {command:t}
  if (!t.format) t.format = 'json'
  return t
}
