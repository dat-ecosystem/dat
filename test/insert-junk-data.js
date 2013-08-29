var getDat = require('dat')
var fs = require('fs')
var data = JSON.parse(fs.readFileSync('data.json'))

var size = 1600
var iterations = process.argv[2] || 10
var source = getDat(__dirname)
source.init({}, function(err, msg) {
  var store = source._storage({}, function(err, seq) {
    go()
    function go() {
      iterations--
      if (iterations <= 0) return
      putBatch(go)
    }
  })
  
  function putBatch(cb) {
    console.time('batch put ' + size)
    var pending = 0
    for (var i = 0; i < size; i++) {
      pending++
      store.put({data: data}, function(err) {
        if (err) console.error(err)
        pending--
        if (pending === 0) {
          console.timeEnd('batch put ' + size)
          cb()
        }
      })
    }
  }
})


