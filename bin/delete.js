var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('delete.txt')
var openDat = require('../lib/util/open-dat.js')

module.exports = {
  name: 'delete',
  command: handleDelete,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    }
  ]
}

function handleDelete (args) {
  if (args._.length === 0) return usage()
  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'), args)

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    var key = args._[0].toString()

    db.del(key, args, function (err) {
      if (err) {
        var msg = 'Error: could not find key ' + key + ' in dataset ' + args.dataset + '.'
        abort(err, args, msg)
      }
      if (!args.json) console.error('Deleted successfully. At version ' + db.head)
      else console.log(JSON.stringify({deleted: key, dataset: args.dataset, version: db.head}))
    })
  })
}
