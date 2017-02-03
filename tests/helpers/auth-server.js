var path = require('path')
var Server = require('dat-land/server')
var initDb = require('dat-land/server/database/init')
var rimraf = require('rimraf')

module.exports = createServer

function createServer (port, cb) {
  var config = {
    township: {
      secret: 'very secret code',
      db: path.join(__dirname, '..', 'test-township.db')
    },
    db: {
      dialect: 'sqlite3',
      connection: { filename: path.join(__dirname, '..', 'test-sqlite.db') },
      useNullAsDefault: true
    },
    cachedb: path.join(__dirname, 'test-cache.db'),
    whitelist: false,
    port: port || 8888
  }
  rimraf.sync(config.db.connection.filename)

  initDb(config.db, function (err, db) {
    if (err) return cb(err)

    const server = Server(config, db)
    server.listen(config.port, function () {
      console.log('listening', config.port)
    })

    cb(null, server, close)

    function close (cb) {
      server.close(function () {
        rimraf.sync(config.township.db)
        rimraf.sync(config.db.connection.filename)
        process.exit()
      })
    }
  })
}
