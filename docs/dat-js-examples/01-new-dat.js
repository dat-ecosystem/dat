var createDat = require('dat')

// create or load a dat database from the `dat-test` folder
// the './dat-test' folder will be created if it does not already exist
var myDat = createDat('./dat-test', ready)

function ready(err) {
  // an error might happen if the dat folder is corrupted or if your hard drive randomly explodes etc
  if (err) return console.error('Uh-oh, there was an error loading dat:', err)
  
  // now that dat has loaded `myDat` from above can be safely used
  // this will log the dat module version number that is being used
  console.log(myDat.version)
}
