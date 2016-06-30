var walker = require('folder-walker')
var each = require('stream-each')

module.exports.initialAppend = function (dat, cb) {
  var appendStats = {
    files: 0,
    dirs: 0,
    bytes: 0
  }
  each(walker(dat.dir, {filter: dat.ignore}), countFiles, function (err) {
    if (err) cb(err)
    dat.appendStats = appendStats
    dat.emit('append-ready')

    if (dat.resume) {
      dat.db.get('!dat!finalized', function (err, val) {
        if (err || val !== 'true') walkFolder(true)
        else walkFolder(true) // TODO: check mtimes
      })
    } else {
      walkFolder()
    }
  })

  function countFiles (data, next) {
    if (data.type === 'directory') {
      appendStats.dirs += 1
    } else {
      appendStats.files += 1
      appendStats.bytes += data.stat.size
    }
    next()
  }

  function walkFolder (resume) {
    var fileStream = walker(dat.dir, {filter: dat.ignore})
    if (resume) each(fileStream, resumeAppend, cb)
    else each(fileStream, appendNew, cb)
  }

  function appendNew (data, next) {
    dat.archive.append({type: data.type, name: data.relname}, function () {
      updateStats(dat, data)
      next()
    })
  }

  function resumeAppend (data, next) {
    dat.archive.lookup(data.relname, function (err, result) {
      if (err || !result) return appendNew(data, next)
      updateStats(dat, data, true)
      return next()
    })
  }
}

module.exports.liveAppend = function (dat, data) {
  if (!dat.ignore(data.filepath)) return
  dat.archive.append({type: data.type, name: data.relname}, function () {
    updateStats(dat, data)
  })
}

function updateStats (dat, data, existing) {
  if (data.type === 'file') dat.stats.filesTotal += 1
  dat.stats.bytesTotal = dat.archive.content ? dat.archive.content.bytes : 0
  if (existing) dat.emit('file-exists', data)
  else dat.emit('file-added', data)
}
