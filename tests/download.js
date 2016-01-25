var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var tmp = os.tmpdir()

test('errors with non 64 character hashes', function (t) {
  var st = spawn(t, dat + ' pizza --home=' + tmp)
  st.stdout.empty()
  st.stderr.match(function (output) {
    var gotError = output.indexOf('Invalid dat link') > -1
    t.ok(gotError, 'got error')
    if (gotError) return true
  })
  st.end()
})

test('does not error with 64 character link', function (t) {
  var st = spawn(t, dat + ' 9d011b6c9de26e53e9961c8d8ea840d33e0d8408318332c9502bad112cad9989 --home=' + tmp)
  st.stderr.match(function (output) {
    var downloading = output.indexOf('Downloading') > -1
    t.ok(downloading, 'downloading')
    if (downloading) {
      st.kill()
      return true
    }
  })
  st.end()
})

test('does not error with 64 character link with dat:// in front', function (t) {
  var st = spawn(t, dat + ' dat://9d011b6c9de26e53e9961c8d8ea840d33e0d8408318332c9502bad112cad9989 --home=' + tmp)
  st.stderr.match(function (output) {
    var downloading = output.indexOf('Downloading') > -1
    t.ok(downloading, 'downloading')
    if (downloading) {
      st.kill()
      return true
    }
  })
  st.end()
})
