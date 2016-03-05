var through = require('through2')

// `stats` is for rendering progress bars
module.exports.createDownloadStream = function (archive, stats, opts) {
  if (!stats) stats = {progress: {}, fileQueue: []}
  if (!opts) opts = {}

  var downloader = through.obj(function (item, enc, next) {
    if (opts.files && (opts.files.indexOf(item.name)) === -1) return next()
    var downloadStats = archive.download(item, function (err) {
      if (err) return next(err)
      if (item.type === 'directory') stats.progress.directories++
      else stats.progress.filesRead++
      next()
    })
    if (item.type === 'file') {
      stats.fileQueue.push({
        name: item.name,
        stats: downloadStats
      })
      downloadStats.on('ready', function () {
        stats.progress.bytesRead += downloadStats.bytesInitial
      })
    }
  })
  downloader.stats = stats
  return downloader
}
