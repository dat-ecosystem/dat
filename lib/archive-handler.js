var rimraf = require('rimraf')
var fs = require('fs')
var path = require('path')
var dirtar = require('dir-tar-stream')

module.exports = function(self, req, res) {
  var backupName = +new Date()
  var backupPath = path.join(self.paths().level, 'backup-' + backupName)
  console.log('creating DB snapshot at', backupPath)
  self.db.db.liveBackup(backupName, function(err) {
    if (err) return res.end(err.toString())
    fs.readdir(backupPath, function(err, files) {
      if (err) return res.end(err.toString())
      res.setHeader('x-file-count', files.length)
      var tarstream = dirtar(backupPath, 'dat.tar.gz')
      console.log('starting tar generation...')
      console.time('generate tar')
      tarstream.on('end', function() {
        console.timeEnd('generate tar')
        rimraf(backupPath, function(err) {
          if (err) return console.error('rm backup', err)
        })
      })
      tarstream.pipe(res)
    })
  })  
}
