var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  dat.versions('Bob', function(err, versions) {
    if (err) return console.error('An error occurred while getting versions:', err)
    
    console.log(versions)
  })
}
