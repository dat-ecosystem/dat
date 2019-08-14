const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const request = require('request')
const spawn = require('./helpers/spawn.js')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
const fixtures = path.join(__dirname, 'fixtures')

test('http - share with http', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  const cmd = dat + ' share --http'
  const st = spawn(t, cmd, { cwd: fixtures })

  st.stdout.match(function (output) {
    const sharingHttp = output.indexOf('Serving files over http') > -1
    if (!sharingHttp) return false

    request('http://localhost:8080', function (err, resp, body) {
      t.error(err, 'no error')
      t.ok(resp.statusCode === 200, 'okay status')
      t.ok(body)

      request('http://localhost:8080/folder/nested/hello.txt', function (err, resp, body) {
        t.error(err, 'no error')
        t.ok(resp.statusCode === 200, 'okay status')
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
  const cmd = dat + ' share --http 3333'
  const st = spawn(t, cmd, { cwd: fixtures })

  st.stdout.match(function (output) {
    const sharingHttp = output.indexOf('Serving files over http') > -1
    if (!sharingHttp) return false

    request('http://localhost:3333', function (err, resp, body) {
      t.error(err, 'no error')
      t.ok(resp.statusCode === 200, 'okay status')
      t.ok(body)

      request('http://localhost:3333/folder/nested/hello.txt', function (err, resp, body) {
        t.error(err, 'no error')
        t.ok(resp.statusCode === 200, 'okay status')
        t.same(body, 'code for science and society', 'body of file okay')

        st.kill()
      })
    })

    return true
  })
  st.stderr.empty()
  st.end()
})
