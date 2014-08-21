var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  var cat = {
    key: 'Bob',
    age: 3,
    type: 'White fur'
  }
  
  // dat will store our cat data and call `done` when it finishes
  dat.put(cat, done)
}
function done(err, row) {
  if (err) return console.error('Could not store Bob!', err)
  
  console.log('Stored Bob', row)
}
