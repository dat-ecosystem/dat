var fs = require('fs')
var path = require('path')
var walker = require('folder-walker')
var level = require('level')
var homedir = require('os-homedir')
var hyperdrive = require('hyperdrive')
var xtend = require('xtend')
var mkdirp = require('mkdirp')
var through = require('through2')
var pump = require('pump')

module.exports = Dat

function Dat (dir, opts) {
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  if (!opts) opts = {}
  this.dir = dir
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  var datPath = path.join(homedir(), '.dat/db')
  if (opts.createIfMissing) mkdirp.sync(datPath)
  var hyperdriveOpts = {name: 'dat'}
  var drive = hyperdrive(level(datPath, opts), hyperdriveOpts)
  this.drive = drive
}

Dat.prototype.share = function () {
  var stream = walker(this.dir, {filter: function (filename) {
    var basename = path.basename(filename)
    if (basename[0] === '.') return false // ignore hidden files and folders
    return true
  }})
  var pack = this.drive.add()
  var adder = through.obj(function (data, enc, next) {
    var isFile = data.stat.isFile()
    if (!isFile) {
      console.log('skipping non file', data.filepath)
      return next()
    }
    console.log('reading', data.filepath)
    var entry = pack.entry({name: data.relname, mode: data.stat.mode})
    fs.createReadStream(data.filepath).pipe(entry)
    next()
  })
  pump(stream, adder, function (err) {
    if (err) throw err
    pack.finalize(function () {
      console.log('added stuff')
    })
  })
}
