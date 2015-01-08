var EOL = require('os').EOL

module.exports = listen

listen.usage = ['dat listen [--port=<port>]', 'DPERECATED: please use `dat-server listen` instead'].join(EOL)

function listen(dat, opts, cb) {
  console.log('`dat listen` is deprecated. Please use:\n\n  npm install -g dat-server\n  dat-server listen\n')
}