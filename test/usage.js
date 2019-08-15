const path = require('path')
const test = require('tape')
const spawn = require('./helpers/spawn.js')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
const version = require('../package.json').version

test('usage - prints usage', t => {
  const d = spawn(t, dat)
  d.stderr.match(output => {
    const usage = output.indexOf('Usage') > -1
    if (!usage) return false
    return true
  })
  d.end()
})

test('usage - prints version', t => {
  const d = spawn(t, dat + ' -v')
  d.stderr.match(output => {
    const ver = output.indexOf(version) > -1
    if (!ver) return false
    return true
  })
  d.end()
})

test('usage - also prints version', t => {
  const d = spawn(t, dat + ' -v')
  d.stderr.match(output => {
    const ver = output.indexOf(version) > -1
    if (!ver) return false
    return true
  })
  d.end()
})

test('usage - help prints usage', t => {
  const d = spawn(t, dat + ' help')
  d.stderr.match(output => {
    const usage = output.indexOf('Usage') > -1
    if (!usage) return false
    return true
  })
  d.end()
})
