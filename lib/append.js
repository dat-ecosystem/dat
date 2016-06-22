var walker = require('folder-walker')
var each = require('stream-each')

module.exports = function (dat, cb) {
  if (dat.resume) {
    dat.db.get('!dat!finalized', function (err, val) {
      if (err || val !== 'true') walkFolder(true)
      else walkFolder(true) // TODO: check mtimes
    })
  } else {
    walkFolder()
  }

  function walkFolder (resume) {
    var fileStream = walker(dat.dir, {filter: ignore})
    if (resume) each(fileStream, checkAppend, cb)
    else each(fileStream, appendEntry, cb)
  }

  function checkAppend (data, next) {
    dat.archive.lookup(data.relname, function (err, result) {
      if (err || !result) return appendEntry(data, next)
      if (data.type === 'file') dat.stats.filesTotal += 1
      dat.stats.bytesTotal = dat.archive.content ? dat.archive.content.bytes : 0
      dat.emit('file-exists', result)
      return next()
    })
  }

  function appendEntry (data, next) {
    dat.archive.append({type: data.type, name: data.relname}, function () {
      if (data.type === 'file') dat.stats.filesTotal += 1
      dat.stats.bytesTotal = dat.archive.content ? dat.archive.content.bytes : 0
      dat.emit('file-added', data)
      next()
    })
  }
}

function ignore (filepath) {
  // TODO: split this out and make it composable/modular/optional/modifiable
  return filepath.indexOf('.dat') === -1 && filepath.indexOf('.swp') === -1
}
