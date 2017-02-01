var progress = require('progress-string')

module.exports = function () {
  return progress({
    width: 50,
    total: 100,
    style: function (complete, incomplete) {
      return '[' + complete + '>' + incomplete + ']'
    }
  })
}
