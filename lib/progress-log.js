var animate = require('animate-tty')
var speedometer = require('speedometer')
var pretty = require('pretty-bytes')
var eos = require('end-of-stream')

module.exports = function (prog, verb, end) {
  var stats = prog.stats || prog
  
  verb = verb || 'Transferred'
  verb += '             '.slice(verb.length)
  
  var count = 0
  var elapsed = 0
  var speed = speedometer()
  var lastBytes = 0
  
  var pad = function(str) {
    if (str.length < 9) return str+'         '.slice(str.length)
    return str
  }
  
  var printer = animate({stream: process.stderr}, printFunc)
  
  eos(prog, function (err) {
    printer.stop(true)
    if (end) console.error(end)
  })
  
  printer.start()

  return printer
  
  function printFunc(runtime) {
    var stats = prog.stats || prog

    speed(stats.bytes - lastBytes)
    lastBytes = stats.bytes
  
    return 'Elapsed      : '+Math.floor(runtime/1000) +' s\n'+
    verb+': '+pad(pretty(stats.bytes || 0)) +' ('+pretty(speed())+'/s)'+ '\n'+
    (stats.changes >= 0 ?   ' - changes : '+stats.changes+'\n' : '')+
    (stats.blobs >= 0 ?     ' - blobs   : '+stats.blobs+'\n'     : '')
  }
}