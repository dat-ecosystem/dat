var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')

module.exports.progress = function (percent) {
  var width = 15
  var cap = '>'
  var ends = ['[', ']']
  var spacer = Array(width).join(' ')
  var progressVal = ''
  var val = Math.round(percent * width)

  if (val && val > 0) {
    progressVal = Array(val).join('=')
    progressVal += cap
  }
  progressVal += spacer
  progressVal = progressVal.substring(0, width)

  return ends[0] + progressVal + ends[1]
}

module.exports.swarmMsg = function (dat) {
  var msg = 'Connected to ' + dat.swarm.connections + ' peers. '
  if (dat.stats.bytesDown) msg += 'Downloading ' + prettyBytes(dat.stats.rateDown()) + '/s. '
  if (dat.stats.bytesUp) msg += 'Uploading ' + prettyBytes(dat.stats.rateUp()) + '/s. '
  if (dat.archive.live) msg += 'Watching for updates...'
  return msg
}

module.exports.keyMsg = function (key) {
  var msg = 'Share Link: ' + chalk.blue.underline(key) + '\n'
  msg += 'The Share Link is secret and only those you share it with will be able to get the files'
  return msg + '\n'
}
