module.exports.progress = function (percent) {
  var width = 15
  var cap = '>'
  var ends = ['[', ']']
  var spacer = Array(width).join(' ')
  var progressVal = ''
  var val = Math.round(percent * width)

  if (val > 0) {
    progressVal = Array(val).join('=')
    progressVal += cap
  }
  progressVal += spacer
  progressVal = progressVal.substring(0, width)

  return ends[0] + progressVal + ends[1]
}
