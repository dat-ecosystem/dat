module.exports = rows

var usage = 'dat rows <put|get|delete>'

var subModules = {
  'put': './rows-put',
  'get': './rows-get',
  'delete': './rows-delete'
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
        
