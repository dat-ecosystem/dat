var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  // first lets get the latest version of bob from dat
  dat.get('Bob', function(err, bob) {
    if (err) return console.error('Bob is not in this dat!', err)
    
    // stream a photo from the hard drive
    var bobPicture = fs.createReadStream('./bob.png')
    
    // the first argument is the filename it should get labeled with in dat
    // the second argument is the row to attach the blob to
    var blobWriteStream = dat.createBlobWriteStream('bob.png', bob, done)
    
    bobPicture.pipe(blobWriteStream)
  })
}
function done(err, row) {
  if (err) return console.error('Could not store the Bob photo!', err)
  
  console.log('Stored the Bob photo', row)
}