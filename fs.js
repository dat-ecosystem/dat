var fs = require('fs')
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
      mode: data.stat.mode,
      uid: data.stat.uid,
      gid: data.stat.gid,
      mtime: data.stat.mtime.getTime(),
      ctime: data.stat.ctime.getTime()
    }
    var isFile = data.stat.isFile()
    if (isFile) {
      item.createReadStream = function () {
        return fs.createReadStream(data.filepath)
      }
    }
    onEach(item, next)
  }, cb)
}
