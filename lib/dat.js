var events = require('events')
var path = require('path')
var util = require('util')
var hyperdrive = require('hyperdrive')
var createSwarm = require('hyperdrive-archive-swarm')
var level = require('level')
var mkdirp = require('mkdirp')
var raf = require('random-access-file')
var speedometer = require('speedometer')
var each = require('stream-each')
var append = require('./append')

var TRANSFER_RATE_TIMEOUT = 1000

module.exports = Dat

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  var self = this

  this.dir = opts.dir || '.'
  this.datPath = opts.datPath || path.join(self.dir, '.dat')
  this.key = opts.key ? Buffer(opts.key, 'hex') : null
  self.snapshot = opts.snapshot
  this.swarm = null
  this.stats = {
    filesTotal: 0,
    bytesTotal: 0,
    filesTransferred: 0,
    bytesTransferred: 0,
    transferRate: speedometer()
  }
  getDb(function (db) {
    self.db = db
    var drive = hyperdrive(db)
    var isLive = opts.key ? null : !opts.snapshot // don't set for download
    self.archive = drive.createArchive(self.key, {
      live: isLive,
      file: function (name) {
        return raf(path.join(self.dir, name))
      }
    })
    self.emit('ready')
  })

  function getDb (cb) {
    // TODO: check if DB exists in dir
    mkdirp.sync(self.datPath)
    var db = level(self.datPath)
    tryResume()

    function tryResume () {
      if (opts.port) db.put('!dat!port', opts.port)
      db.get('!dat!key', function (err, value) {
        if (err) return cb(db)
        self.key = value
        self.resume = true
        db.get('!dat!port', function (err, portVal) {
          if (err || !portVal) return cb(db)
          self.port = portVal
          return cb(db)
        })
      })
    }
  }
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.addFiles = function (cb) {
  var self = this
  var archive = self.archive
  var noDataTimeout = null

  archive.open(function (err) {
    if (err) return cb(err)

    if ((archive.live || archive.owner) && archive.key) {
      if (!self.key) self.db.put('!dat!key', archive.key.toString('hex'))
      self.joinSwarm()
      self.emit('key', archive.key.toString('hex'))
    }

    append(self, done)
  })

  archive.on('upload', function (data) {
    self.stats.bytesTransferred += data.length
    self.stats.transferRate(data.length)
    self.emit('upload', data)
    if (noDataTimeout) clearInterval(noDataTimeout)
    noDataTimeout = setInterval(function () {
      self.stats.transferRate(0)
    }, TRANSFER_TIMEOUT)
  })

  function done (err) {
    if (err) return cb(err)

    archive.finalize(function (err) {
      if (err) return cb(err)
      self.db.put('!dat!finalized', true)

      if (self.snapshot) {
        self.joinSwarm()
        self.emit('key', archive.key.toString('hex'))
        cb(null)
      }
      // TODO: add yolo watch
    })
  }
}

Dat.prototype.download = function (cb) {
  var self = this
  var archive = self.archive
  var noDataTimeout = null

  self.joinSwarm()
  self.emit('key', self.key.toString('hex'))

  archive.open(function (err) {
    if (err) return cb(err)
    self.db.put('!dat!key', archive.key.toString('hex'))

    each(archive.list({live: archive.live}), function (data, next) {
      var startBytes = self.stats.bytesTransferred
      archive.download(data, function (err) {
        if (err) return cb(err)
        self.stats.filesTransferred += 1
        self.emit('file-downloaded', data)
        if (startBytes === self.stats.bytesTransferred) self.stats.bytesTransferred += data.length // file already exists
        next()
      })
    }, done)
  })

  archive.on('download', function (data) {
    self.stats.bytesTransferred += data.length
    self.stats.transferRate(data.length)
    self.emit('download', data)
    if (noDataTimeout) clearInterval(noDataTimeout)
    noDataTimeout = setInterval(function () {
      self.stats.transferRate(0)
    }, TRANSFER_TIMEOUT)
  })

  function done () {
    self.emit('download-finished')
    cb(null)
  }
}

Dat.prototype.joinSwarm = function () {
  var self = this
  self.swarm = createSwarm(self.archive, {port: self.port})
  self.emit('connecting')
  self.swarm.on('connection', function (peer) {
    self.emit('swarm-update')
    peer.on('close', function () {
      self.emit('swarm-update')
    })
  })
}
