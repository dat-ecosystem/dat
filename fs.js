var through = require('through2')
var path = require('path')
var walker = require('folder-walker')
var each = require('stream-each')

module.exports.listEach = function (opts, onEach, cb) {
  var stream = walker(opts.dir, {filter: function (data) {
    if (path.basename(data) === '.dat') return false
    if ((typeof opts.filter) === 'function') return opts.filter(data)
    return true
  }})
  var dirname = path.basename(opts.dir)

  each(stream, function (data, next) {
    var prefix = path.resolve(data.filepath) !== path.resolve(opts.dir)
    var item = {
      name: prefix ? path.join(dirname, data.relname) : data.relname,
      path: path.resolve(data.filepath),
      mode: data.stat.mode,
      uid: data.stat.uid,
      gid: data.stat.gid,
      mtime: data.stat.mtime.getTime(),
      ctime: data.stat.ctime.getTime(),
      size: data.stat.size
    }

    var isFile = data.stat.isFile()
    if (isFile) {
      item.type = 'file'
    }
    var isDir = data.stat.isDirectory()
    if (isDir) item.type = 'directory'
    onEach(item, next)
  }, cb)
}

// `stats` is for rendering progress bars
module.exports.createDownloadStream = function (archive, stats) {
  if (!stats) stats = {progressStats: {}, files: []}
  stats.progressStats.directories = 0

  var downloader = through.obj(function (item, enc, next) {
    var downloadStats = archive.download(item, function (err) {
      if (err) return next(err)
      if (item.type === 'directory') stats.progressStats.directories++
      next()
    })
    if (item.type === 'file') {
      stats.files.push({
        name: item.name,
        stats: downloadStats
      })
    }
  })
  downloader.stats = stats
  return downloader
}
