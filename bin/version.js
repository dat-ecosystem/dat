module.exports = function(dat, opts, cb) {
  console.log('dat version ' + dat.version)
  process.nextTick(cb)
}
