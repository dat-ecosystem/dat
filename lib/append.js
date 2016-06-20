var walker = require('folder-walker')
var each = require('stream-each')

module.exports = function (dat, cb) {
  var firstAppend = true

  if (dat.resume) {
    dat.db.get('!dat!finalized', function (err, val) {
      if (err || val !== 'true') return walkFolder(true)
      else walkFolder(true) // TODO: check mtimes
    })
  } else {
    walkFolder()
  }

  function walkFolder (resume) {
    var fileStream = walker(dat.dir, {filter: function (data) {
      return data.indexOf('.dat') === -1
    }})
    if (resume) each(fileStream, checkAppend, cb)
    else each(fileStream, appendEntry, cb)
  }

  function checkAppend (data, next) {
    if (firstAppend) {
      firstAppend = false // folder walker seems off on the first item. TODO: investigate
      return next()
    }
    dat.archive.lookup(data.relname, function (err, result) {
      if (!err && result) {
        dat.emit('file-exists', result)
        return next()
      }
      appendEntry(data, next)
    })
  }

  function appendEntry (data, next) {
    if (firstAppend) {
      firstAppend = false // folder walker seems off on the first item. TODO: investigate
      return next()
    }
    dat.archive.append({type: data.type, name: data.relname}, function () {
      dat.emit('file-added', data)
      next()
    })
  }
}