module.exports = rows

var subModules = {
  'put': './blobs-put',
  'get': './blobs-get',
}

rows.commands = {
  'put': require('./blobs-put'),
  'get': require('./blobs-get')
}

var usage = rows.usage = 'dat blobs <put|get> [options]'
  
function rows(dat, opts, cb) {
  return cb(new Error('Usage: ' + usage))
}
    
    