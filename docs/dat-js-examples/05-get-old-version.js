var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  dat.get('Bob', {version: 1}, function(err, bob) {
    if (err) return console.error('Bob at version 1 could not be got!', err)
    
    console.log(bob)
  })
}
