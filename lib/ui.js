var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')

module.exports.progress = function (percent) {
  var width = 30
  var cap = '>'
  var ends = ['[', ']']
  var spacer = Array(width).join(' ')
  var progressVal = ''
  if (percent > 1) percent = 1 // TODO: remove when we fix stats
  var val = Math.round(percent * width)

  if (isFinite(val) && val > 0) {
    progressVal = Array(val).join('=')
    progressVal += cap
  }
  progressVal += spacer
  progressVal = progressVal.substring(0, width)

  if (percent >= 1) return ends[0] + chalk.green(progressVal) + ends[1]
  else return ends[0] + chalk.blue(progressVal) + ends[1]
}

module.exports.swarmMsg = function (dat) {
  var msg = ''
  if (dat.swarm && dat.swarm.connections) msg = 'Connected to ' + dat.swarm.connections + ' peers. '
  else msg = 'Waiting for connections. '
  if (dat.stats.rateDown && dat.stats.rateDown()) msg += 'Downloading ' + prettyBytes(dat.stats.rateDown()) + '/s. '
  if (dat.stats.rateUp && dat.stats.rateUp()) msg += 'Uploading ' + prettyBytes(dat.stats.rateUp()) + '/s. '
  if (dat.archive && dat.archive && dat.archive.live && dat.archive.owner) msg += 'Watching for updates...'
  return msg
}

module.exports.keyMsg = function (key) {
  var msg = 'Share Link: '
  msg += chalk.blue.underline(key) + '\n'
  msg += 'The Share Link is secret and only those you share it with will be able to get the files'
  return msg + '\n'
}
