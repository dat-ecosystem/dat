var crypto = require('crypto')

module.exports.hash = function (doc) {
  if (doc._rev) {
    var rev = doc._rev
    delete doc._rev
  }
  var hash = crypto.createHash('md5').update(JSON.stringify(doc)).digest("hex")
  if (rev) {
    doc._rev = rev
  }
  return hash
}

module.exports.revision = function (rev) {
  var seq
  if (!rev) seq = 0
  else seq = parseInt(rev.slice(0, rev.indexOf('-')))
  if (isNaN(seq)) { console.error('BAD!'); seq = 0}
  return seq
}