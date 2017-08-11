var fs = require('fs')
var path = require('path')
var encoding = require('dat-encoding')

module.exports = function (opts) {
  // dat [<cmd>] arg1 arg2 [options]
  // parse args without options from opts._
  // return parsed { dir, key }
  var parsed = {
    key: opts.key || null,
    dir: opts.dir || null // process.cwd() ?
  }

  // dat [<cmd>]
  if (!opts._.length) return parsed

  // dat [<cmd>] arg1 arg2
  // arg1 = key
  // arg2 = dir
  if (opts._.length === 2) {
    parsed.key = opts._[0]
    parsed.dir = opts._[1]
    return parsed
  }

  // dat [<cmd>] arg
  // arg = dir or key

  // First, check if key
  try {
    parsed.key = encoding.toStr(opts._[0])
    return parsed
  } catch (err) {
    if (err && err.message !== 'Invalid key') {
      // catch non-key errors
      console.error(err)
      process.exit(1)
    }
  }

  try {
    var stat = fs.statSync(opts._[0])
    if (stat.isFile()) {
      parsed.dir = path.resolve(path.dirname(opts._[0]))
    } else {
      parsed.dir = opts._[0]
    }
  } catch (err) {
    if (err && !err.name === 'ENOENT') {
      console.error(err)
      process.exit(1)
    }
  }

  return parsed
}
