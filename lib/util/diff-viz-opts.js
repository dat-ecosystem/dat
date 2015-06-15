module.exports = {
  getRowValue: function (row) { return row.value },
  getHeaderValue: function (diff, i) {
    var onediff = diff && diff[0] || diff[1]
    return 'row ' + (i + 1) + ' key: ' + onediff['key'] + '\n'
  }
}
