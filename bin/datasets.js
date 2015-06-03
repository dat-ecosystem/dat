var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('datasets.txt')

module.exports = {
  name: 'datasets',
  command: handleDatasets
}

function handleDatasets (args) {
  if (args.help) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)

    db.listDatasets(function (err, datasets) {
      if (err) abort(err, args)
      if (args.json) console.log(JSON.stringify({datasets: datasets}))
      else console.log(datasets.join('\n'))
    })
  })
}
