var fs = require('fs')
var concat = require('concat-stream')

module.exports = rowsPut

rowsPut.usage = 'dat rows put <file-path-to-read>'

rowsPut.options = [
  {
    name: 'key',
    abbr: 'k',
    help: 'row key to use'
  },
  {
    name: 'quiet',
    abbr: 'q',
    boolean: true,
    help: 'less logging'
  }
]

function rowsPut(dat, opts, cb) {
  var args = opts._.slice(2)
  var key = opts.key
  var file = args[0]
  
  if(file && file !== '-') {
    fs.readFile(file, function (err, content) {
      if(err) return cb(err)
      putRow(content)
    })
  } else {
    if (!opts.quiet) console.log('No JSON file specified, using STDIN as input')
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