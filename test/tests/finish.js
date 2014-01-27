module.exports = function (test, cb) {
  test('', function(t) {
    if (cb) cb()
    t.end()
  })
}