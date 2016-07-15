var events = require('events')
var fs = require('fs')
var path = require('path')
var util = require('util')
var encoding = require('dat-encoding')
var hyperdrive = require('hyperdrive')
var createSwarm = require('hyperdrive-archive-swarm')
var level = require('level')
var raf = require('random-access-file')
var speedometer = require('speedometer')
var each = require('stream-each')
var yoloWatch = require('yolowatch')
var append = require('./append')

module.exports = Dat

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  var self = this

  this.dir = opts.dir === '.' ? process.cwd() : opts.dir
  this.datPath = opts.datPath || path.join(self.dir, '.dat')
  this.key = opts.key ? encoding.decode(opts.key) : null
  this.snapshot = opts.snapshot
  this.ignore = ignore
  this.swarm = null
  this.stats = {
    filesTotal: 0,
    filesProgress: 0,
    bytesTotal: 0,
    bytesProgress: 0,
    bytesUp: 0,
    bytesDown: 0,
    rateUp: speedometer(),
    rateDown: speedometer()
  }
  getDb(function (err, db) {
    if (err) return self.emit('error', err)
    self.db = db
    var drive = hyperdrive(db)
    var isLive = opts.key ? null : !opts.snapshot
    self.archive = drive.createArchive(self.key, {
      live: isLive,
      file: function (name) {
        return raf(path.join(self.dir, name))
      }
    })
    self.emit('ready')
  })

  function getDb (cb) {
    if (!fs.existsSync(self.datPath)) fs.mkdirSync(self.datPath)
    var db = level(self.datPath)
    tryResume()

    function tryResume () {
      if (opts.port) db.put('!dat!port', opts.port)
      db.get('!dat!key', function (err, value) {
        if (err && !err.notFound) return cb(err)
        if (!value) return cb(null, db)
        value = encoding.decode(value)
        if (self.key && self.key === value) return cb('Existing key does not match.')
        self.key = value
        self.resume = true
        db.get('!dat!port', function (err, portVal) {
          if (err && !err.notFound) return cb(err)
          if (portVal) self.port = portVal
          return cb(null, db)
        })
      })
    }
  }

  function ignore (filepath) {
    // TODO: split this out and make it composable/modular/optional/modifiable
    return filepath.indexOf('.dat') === -1 && filepath.indexOf('.swp') === -1
  }
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.share = function (cb) {
  var self = this
  var archive = self.archive

  archive.open(function (err) {
    if (err) return cb(err)

    if (archive.key && !archive.owner) {
      // TODO: allow this but change to download
      cb(new Error('Dat previously downloaded. Run dat ' + encoding.encode(archive.key) + ' to resume'))
    }

    if ((archive.live || archive.owner) && archive.key) {
      if (!self.key) self.db.put('!dat!key', archive.key.toString('hex'))
      self.joinSwarm()
      self.emit('key', archive.key.toString('hex'))
    }

    append.initialAppend(self, done)
  })

  archive.on('upload', function (data) {
    self.stats.bytesUp += data.length
    self.stats.rateUp(data.length)
    self.emit('upload', data)
  })

  function done (err) {
    if (err) return cb(err)

    archive.finalize(function (err) {
      if (err) return cb(err)

      if (self.snapshot) {
        self.joinSwarm()
        self.emit('key', archive.key.toString('hex'))
        self.emit('archive-finalized')
        self.db.put('!dat!finalized', true, cb)
      }

      self.db.put('!dat!finalized', true, function (err) {
        if (err) return cb(err)
        self.emit('archive-finalized')
        watchLive()
      })

      function watchLive () {
        var watch = yoloWatch(self.dir, {filter: self.ignore})
        watch.on('changed', function (name, data) {
          if (name === self.dir) return
          self.emit('archive-updated')
          append.liveAppend(self, data)
        })
        watch.on('added', function (name, data) {
          self.emit('archive-updated')
          append.liveAppend(self, data)
        })
      }
    })
  }
}

Dat.prototype.download = function (cb) {
  var self = this
  var archive = self.archive

  self.joinSwarm()
  self.emit('key', archive.key.toString('hex'))

  archive.open(function (err) {
    if (err) return cb(err)
    self.db.put('!dat!key', archive.key.toString('hex'))
    updateTotalStats()

    archive.content.on('download-finished', function () {
      self.emit('download-finished')
    })

    each(archive.list({live: archive.live}), function (data, next) {
      var startBytes = self.stats.bytesProgress
      archive.download(data, function (err) {
        if (err) return cb(err)
        self.stats.filesProgress += 1
        self.emit('file-downloaded', data)
        if (startBytes === self.stats.bytesProgress) {
          // TODO: better way to measure progress with existing files
          self.stats.bytesProgress += data.length // file already exists
        }
        // if (self.stats.filesProgress === self.stats.filesTotal) self.emit('download-finished')
        next()
      })
    }, function (err) {
      if (err) return cb(err)
      cb(null)
    })
  })

  archive.metadata.once('download-finished', updateTotalStats)

  archive.metadata.on('update', function () {
    updateTotalStats()
    self.emit('archive-updated')
  })

  archive.on('download', function (data) {
    self.stats.bytesProgress += data.length
    self.stats.bytesDown += data.length
    self.stats.rateDown(data.length)
    self.emit('download', data)
  })

  archive.on('upload', function (data) {
    self.stats.bytesUp += data.length
    self.stats.rateUp(data.length)
    self.emit('upload', data)
  })

  function updateTotalStats () {
    self.stats.filesTotal = archive.metadata.blocks - 1 // first block is header.
    self.stats.bytesTotal = archive.content ? archive.content.bytes : 0
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
