var walker = require('folder-walker')
var each = require('stream-each')

module.exports.initialAppend = function (dat, cb) {
  each(walker(dat.dir, {filter: dat.ignore}), countFiles, function (err) {
    if (err) cb(err)
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
    dat.emit('file-counted')
    dat.stats.filesTotal += 1
    dat.stats.bytesTotal += data.stat.size
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
  dat.stats.bytesTotal += data.stat.size
  dat.stats.filesTotal += 1
  dat.archive.append({type: data.type, name: data.relname}, function () {
    updateStats(dat, data)
  })
}

function updateStats (dat, data, existing) {
  dat.stats.filesProgress += 1
  dat.stats.bytesProgress += data.stat.size
  if (existing) dat.emit('file-exists', data)
  else dat.emit('file-added', data)
}
