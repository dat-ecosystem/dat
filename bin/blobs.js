module.exports = blobs

var subModules = {
  'put': './blobs-put',
  'get': './blobs-get',
}

blobs.commands = {
  'put': require('./blobs-put'),
  'get': require('./blobs-get')
}

blobs.noDat = true

var usage = blobs.usage = 'dat blobs <put|get> [options]'
  
function blobs(dat, opts, cb) {
  return cb(new Error('Usage: ' + usage))
}
    
    