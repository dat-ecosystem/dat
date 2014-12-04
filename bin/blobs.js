module.exports = rows

var usage = 'dat blobs <put|get>'

var subModules = {
  'put': './blobs-put',
  'get': './blobs-get',
}

rows.usage = function (opts) {
  var modulePath = subModules[opts._[1]]
  if(!modulePath) return usage
    return require(modulePath).usage
}
  
function rows(dat, opts, cb) {
  var modulePath = subModules[opts._[1]]
  if(!modulePath) return cb(new Error('Usage: ' + usage))
    require(modulePath)(dat, opts,cb)
}
    
    