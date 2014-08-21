var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  // first lets get the latest version of bob from dat
  dat.get('Bob', gotBob)
}
function gotBob(err, bob) {
  if (err) return console.error('Could not get Bob!', err)
  
  // update bobs age and put him back in the database
  bob.age = 4
  dat.put(bob, done)
}
  
function done(err, updated) {
  if (err) return console.error('Could not update Bob!', err)
  
  // now bob is at version 2
  console.log('Updated Bob:', updated)
}
