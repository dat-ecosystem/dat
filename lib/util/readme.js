var concat = require('concat-stream')
var pump = require('pump')
var str = require('string-to-stream')

module.exports = {}

module.exports.init = function (db, cb) {
  var opts = {
    dataset: 'files',
    message: 'Add Readme',
    content: 'file'
  }
  var readme = '# Readme\n\nThis readme is empty.'
  pump(str(readme), db.createFileWriteStream('readme.md', opts), function (err) {
    return cb(err, readme)
  })
}

module.exports.get = function (db, cb) {
  var readStream = db.createFileReadStream('readme.md', {dataset: 'files'})
  var getReadme = concat(function (data) { cb(null, data.toString()) })
  pump(readStream, getReadme, function (err) {
    if (err) cb(err)
  })
}
