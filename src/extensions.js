var debug = require('debug')('dat')
var os = require('os')

module.exports = runExtension

function runExtension (opts) {
  debug('Trying Extenion', opts._[0])

  var extName = opts._.shift()
  trySpawn(function () {
    console.error('We could not run the extension. Please make sure it is installed:')
    console.error(`npm install -g dat-${extName}`)
    process.exit(1)
  })

  function trySpawn (cb) {
    var spawn = require('child_process').spawn
    var name = 'dat-' + extName
    if (os.platform() === 'win32') {
      name += '.cmd'
    }
    var child = spawn(name, process.argv.splice(3))
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
    child.on('error', function (err) {
      if (err.code === 'ENOENT') return cb()
      throw err
    })
    child.on('close', function (code) {
      process.exit(code)
    })
  }
}
