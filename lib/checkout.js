module.exports = function (db, head) {
  return db.checkout(head === 'latest' ? null : head, {persistent: true})
}
