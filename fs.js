var through = require('through2')

// `stats` is for rendering progress bars
module.exports.createDownloadStream = function (archive, stats) {
  if (!stats) stats = {progress: {}, fileQueue: []}

  var downloader = through.obj(function (item, enc, next) {
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
