module.exports = rows

var usage = rows.usage  =  'dat rows <put|get|delete>'

rows.commands = {
  'put': require('./rows-put'),
  'get': require('./rows-get'),
  'delete': require('./rows-delete')
}
    
function rows(dat, opts, cb) {
  return cb(new Error('Usage: ' + usage))
}
        
