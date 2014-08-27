// TODO: rewrite this insanity

var speedometer = require('speedometer')
var clearLog = require('single-line-log')
var pretty = require('pretty-bytes')
var eos = require('end-of-stream')

module.exports = function(prog, verb, end) {
  verb = verb || 'Transferred'
  verb += '             '.slice(verb.length)

  var start = Date.now()
  var count = 0
  var elapsed = 0
  var speed = speedometer()
  var lastBytes = 0

  var pad = function(str) {
    if (str.length < 9) return str+'         '.slice(str.length)
    return str
  }

  var draw = function() {
    var stats = prog.stats || prog

    speed(stats.bytes - lastBytes)
    lastBytes = stats.bytes

    var runtime = Math.floor((Date.now() - start) / 1000)

    clearLog(
      'Elapsed      : '+runtime+' s\n'+
      verb+': '+pad(pretty(stats.bytes || 0)) +' ('+pretty(speed())+'/s)'+ '\n'+
      (stats.changes >= 0 ?   ' - changes : '+stats.changes+'\n' : '')+
      (stats.blobs >= 0 ?     ' - blobs   : '+stats.blobs+'\n'     : '')
    )
  }

  var interval = setInterval(draw, 250)
  draw()
  eos(prog, function(err) {
    draw()
    clearInterval(interval)
    if (err) clearLog.clear()
    else if (end) console.log(end)
  })
}