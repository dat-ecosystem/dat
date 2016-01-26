var fs = require('fs')
var through = require('through2')
var path = require('path')
var walker = require('folder-walker')
var each = require('stream-each')

module.exports.listEach = function (opts, onEach, cb) {
  var stream = walker(opts.dir, {filter: opts.filter || function (filename) {
    var basename = path.basename(filename)
    if (basename[0] === '.') return false // ignore hidden files and folders
    return true
  }})

  each(stream, function (data, next) {
    var item = {
      name: data.relname,
      path: opts.dir === data.filepath ? path.resolve(data.filepath) : path.resolve(opts.dir, data.filepath),
      mode: data.stat.mode,
      uid: data.stat.uid,
      gid: data.stat.gid,
      mtime: data.stat.mtime.getTime(),
      ctime: data.stat.ctime.getTime(),
      size: data.stat.size
    }
    var isFile = data.stat.isFile()
    if (isFile) {
      item.createReadStream = function () {
        return fs.createReadStream(data.filepath)
      }
      item.type = 'file'
    }
    var isDir = data.stat.isDirectory()
    if (isDir) item.type = 'directory'
    onEach(item, next)
  }, cb)
}

// `stats` is for rendering progress bars
module.exports.createDownloadStream = function (archive, stats) {
  if (!stats) stats = {}
  stats.files = 0
  stats.directories = 0

  var downloader = through.obj(function (entry, enc, next) {
    archive.download(entry, function (err) {
      if (err) return next(err)
      if (entry.type === 'directory') stats.directories++
      else stats.files++
      next()
    })
  })
  downloader.stats = stats
  return downloader
}
