var fs = require('fs')
var concat = require('concat-stream')

// 'Usage: dat rows put <file-path-to-read> [--key=row-key-to-use]'
module.exports = function (dat, opts, cb) {
  var args = opts._.slice(2)
  var key = opts.key || opts.k
  var file = args[0]
  
  if(file) {
    fs.readFile(file, function (err, content) {
      if(err) return cb(err)
      putRow(content)
    })
  } else {
    process.stdin.pipe(concat(putRow))
  }
  
  function putRow(content) {
    try {
      var data = JSON.parse(content)
    } catch(e) {
      return cb(new Error('Could not parse JSON: ' + e.message))
    }
    if(key) data.key = key
    dat.put(data, function (err, row) {
      if(err) return cb(err)
      console.log('Saved row with key', row.key)
      cb()
    })
  }
}