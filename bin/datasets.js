var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('datasets.txt')

module.exports = {
  name: 'datasets',
  command: handleDatasets
}

function handleDatasets (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    db.listDatasets(function (err, datasets) {
      if (err) abort(err, args)
      if (args.json) console.log(JSON.stringify({datasets: datasets}, 2))
      else console.log(datasets.join('\n'))
      db.close()
    })
  })
}
