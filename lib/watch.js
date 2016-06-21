var fs = require('fs')

module.exports = yoloWatch

function yoloWatch (dir, onchange) {
  var stats = {}

  kick(true, function () {
    fs.watch(dir, function () {
      kick(false, function () {})
    })
  })

  function kick (first, cb) {
    fs.readdir(dir, function (err, files) {
      if (err) return

      loop()

      function loop () {
        var file = files.shift()
        if (!file) return cb()

        fs.stat(path.join(dir, file), function (err, st) {
          if (err) return loop()

          if (!stats[file] || st.nlink !== stats[file].nlink) {
            stats[file] = st
            if (!first) onchange(file, st)
          }

          loop()
        })
      }
    })
  }
}
