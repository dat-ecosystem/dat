var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')
var { fetchText } = require('./helpers')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

test('http - share with http', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  var cmd = dat + ' share --http'
  var st = spawn(t, cmd, { cwd: fixtures })

  st.stdout.match(function (output) {
    var sharingHttp = output.indexOf('Serving files over http') > -1
    if (!sharingHttp) return false

    fetchText('http://localhost:8080').then(function ({ resp, body, error }) {
      t.error(error, 'no error')
      t.ok(resp.status === 200, 'okay status')
      t.ok(body)

      fetchText('http://localhost:8080/folder/nested/hello.txt').then(function ({ resp, body, error }) {
        t.error(error, 'no error')
        t.ok(resp.status === 200, 'okay status')
        t.same(body, 'code for science and society', 'body of file okay')

        st.kill()
      })
    })
    return true
  })
  st.stderr.empty()
  st.end()
})

test('http - share with http other port', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  var cmd = dat + ' share --http 3333'
  var st = spawn(t, cmd, { cwd: fixtures })

  st.stdout.match(function (output) {
    var sharingHttp = output.indexOf('Serving files over http') > -1
    if (!sharingHttp) return false

    fetchText('http://localhost:3333').then(function ({ resp, body, error }) {
      t.error(error, 'no error')
      t.ok(resp.status === 200, 'okay status')
      t.ok(body)

      fetchText('http://localhost:3333/folder/nested/hello.txt').then(function ({ resp, body, error }) {
        t.error(error, 'no error')
        t.ok(resp.status === 200, 'okay status')
        t.same(body, 'code for science and society', 'body of file okay')

        st.kill()
      })
    })
    return true
  })
  st.stderr.empty()
  st.end()
})
