var ldjson = require('ldjson-stream')
var duplexer = require('duplexer2')
var execspawn = require('execspawn')
var extend = require('extend')
var os = require('os')
var path = require('path')
var splicer = require('stream-splicer')

var SEP = os.platform() === 'win32' ? ';' : ':'
var PATH = path.join('node_modules', '.bin') + SEP + process.env.PATH

module.exports = function(transforms) {
  transforms = transforms
    .map(normalize)
    .map(function(t, i) {
      // TODO: support more formats
      if (t.format !== 'json') throw new Error('Transform #'+i+' not a non supported format')

      if (t.command) return command(t)

      throw new Error('Transform #'+i+' is not currently support')
    })

  var pipeline = splicer.obj(transforms)

  pipeline.unshift(ldjson.serialize())
  pipeline.push(ldjson.parse())

  return pipeline
}

function command(t) {
  var env = extend({}, process.env, {PATH:PATH})
  var proc = execspawn(t.command, {env:env})
  var dup = duplexer(proc.stdin, proc.stdout)
  dup.format = t.format
  proc.stderr.resume() // drain it!
  return dup
}

function normalize(t) {
  if (typeof t === 'string') t = {command:t}
  if (!t.format) t.format = 'json'
  return t
}
