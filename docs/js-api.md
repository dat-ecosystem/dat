# dat programmatic API

`dat` is a node module that you can require with e.g. `var dat = require('dat')`

## Create a dat instance

```js
var db = dat([path], [options], [onReady])
```

Returns a new dat instance and either opens the existing underlying database or creates a new empty one. All arguments are optional. 

`path` is the path to the folder inside of which dat should put it's `.dat` folder. If a `.dat` folder already exists there dat will open the existing dat store, otherwise a new one will be created. If not specified it will use `process.cwd()`

`onReady` gets called with `(err)` when dat is ready to be used. If there is an `err` then it means something went wrong when start up dat.

### Options

* `init` (default `true`) - if `false` dat will not create a new empty database when it starts up
* `storage` (default `true`) - if `false` dat will not try to read the underlying database when it starts up
* `path` (default `process.cwd()`) - if not specified as the first argument to the constructor it will check `options.path` instead
* `adminUser` and `adminPass` (default `undefined`) - if both are set any write operations will require HTTP basic auth w/ these credentials
* `leveldown` (default `require('leveldown-prebuilt')`) - pass in a custom leveldown backend
* `db` - pass in a custom levelup instance. if specified the `leveldown` option will be ignored, and your tabular data will be stored entirely in the `db` instance you pass in
* `blobs` (default `require('lib/blobs.js')`) - pass in a custom blob store
* `replicator` (default `require('lib/replicator.js')`) - pass in a custom replicator
* `remoteAddress` (default `undefined`) - if specified then dat will run in RPC client mode
* `manifest` (default `undefined`) - if `remoteAddress` is also true this RPC manifest object will be used by `multilevel.client`
* `skim` (default `false`) - if `true` dat will operate in 'skim blobs' mode, meaning blobs will be lazily fetched from a remote source
* `transformations` (default none) - specify transformations to load -- see below for details
* `hooks` (default none) - specify hooks to load -- see below for details

note: the `options` object also gets passed to the `levelup` constructor

#### transformations

You can hook transformation modules up to happen before `put`s  or after `get`s.

Pass them in like this in the dat options:

```
{
  "transformations": {
    "get": "transform-uppercase",
    "put": [{"module": "./lowercase-stream.js"}]
  }
}
```

The value of a transform can be:

**string**, executable command to run as this transform

**object**, with these optional fields:

```js
{
  "command": "./foo.sh" // executable command to run as this transform,
  "module": "./transform.js" // node.js transform module to use instead
}
```

or **array**, an array of the above transform strings or objects. these will get piped together as a single pipeline.

If you use the e.g. `transform-uppercase` module or other modules from npm as a transform make sure to also make a package.json file in the same directory as your dat to properly manage and install your modules with npm!

If you are using command strings or the **command** option, your executable transform program should accept line delimited JSON data to STDIN and write modified versions of each incoming row as line delimited JSON data to STDOUT.

If you are using the **module** option, the module you pass in can either be a relative path to a module or a module name in the current module scope. dat will `require()` your module. Your module must export a passthrough Streams2 stream with `objectMode: true`, e.g.:

```js
module.exports = ObjectModePassthroughStream
```

#### hooks

Right now the only hook is `listen`, which is executed whenever the dat server binds to a port. A dat listen hook is useful for making sure some operation is running whenever dat is running.

A dat listen hook currently must be a Node module in the following form:

```js
module.exports = function hook(dat, done) {
  // do stuff with dat
  
  // must call done when the hook is done initializing, even if you call it immediately
  done()
}
```

Your hook function will get called with `dat, done`, where `dat` is a fully initialized dat instance. You *must* call `done` when your hook is done initializing.

The [dat-npm](https://github.com/mafintosh/dat-npm#readme) importer is a good example of a dat listen hook.

## help

## get

```js
db.get(key, [options], callback)
```

Gets a key, calls callback with `(error, value)`. `value` is a JS object

### Options

* `version` (defaults to latest) - gets row as specific version, e.g. `{version: 3}`

## put

```js
db.put([key], value, [opts], cb)
```

Puts value into the database by key. Specify the key you want by setting it as either `key` or `value.key`, e.g. `db.put({key: 'bob'} ... )`. `key` is optional to be compatible with the levelup API

`cb` will be called with `(error, newVersion)` where `newVersion` will be be a JS object with `key` and `version` properties.

If something already exists in the database with the key you specified you may receive a conflict error. To ensure you do not overwrite data accidentally you must pass in the current version of the key you wish to update, e.g. if `bob` is in the database at version 1 and you want to update it to add a `foo` key: `db.put({key: 'bob', version: 1, 'foo': 'bar'})`, which will update the row to version 2.

All versions of all rows are persisted and replicated.

If `Buffer.isBuffer(value)` is truthy then it will store whatever binary data is in `value` (only use this if you know what you are doing)

### Options

* `force` (default `false`) - if true it will bypass revision checking and override any conflicts that may normally happen + create a new version of the row

## delete

```js
db.delete(key, cb)
```

Marks `key` as deleted. Note: does not destroy old versions. Calls `cb` with `(err, newVersion)`

## createReadStream

```js
var readStream = db.createReadStream([opts])
```

Returns a [read stream](https://github.com/rvagg/node-levelup#createReadStream) over the most recent version of all rows in the dat store.

Rows are returned in the format `{key: key, value: value}` where key is by default a string and value is by default a JS object.

### Options

* `start` (defaults to the beginning of the possible keyspace) - key to start iterating from
* `end` (defaults to the end of the possible keyspace) - key to stop iterating at
* `limit` (default unlimited) - how many rows to return before stopping

Note: not all options from `levelup.createReadStream` are supported at this time

## createValueStream

```js
var valueStream = db.createValueStream([opts])
```

Returns a [value stream](https://github.com/rvagg/node-levelup#createValueStream) over the most recent version of all rows in the dat store.

By default the returned stream is a readable object stream that will emit 1 JS object per row (equivalent to the `.value` object returned by `createReadStream`). This differs slightly from levelup where the value stream is not an object stream by default.

You can also pass in options to serialize the values as either CSV or line-delimited JSON (see below).

### Options

* `start` (defaults to the beginning of the possible keyspace) - key to start iterating from
* `end` (defaults to the end of the possible keyspace) - key to stop iterating at
* `limit` (default unlimited) - how many rows to return before stopping
* `format` (default `objectMode`) - if set to `csv` or `json` the stream will not be an object mode stream and will emit serialized data
* `csv` (default `false`) - if true is equivalent to setting `format` to `csv`
* `json` (default `false`) - if true is equivalent to setting `format` to `json`

## createKeyStream

```js
var keyStream = db.createKeyStream([opts])
```

Returns a [key stream](https://github.com/rvagg/node-levelup#createKeyStream) over the most recent version of all keys in the dat store.

By default the returned stream is a readable object stream that will emit 1 JS object per row in the form `{key: key, version: number, deleted: boolean}`. This differs slightly from levelup where the value stream is not an object stream by default. Dat stores the key, version and deleted status in the key on disk which is why all 3 properties are returned by this stream.

### Options
* `start` (defaults to the beginning of the possible keyspace) - key to start iterating from
* `end` (defaults to the end of the possible keyspace) - key to stop iterating at
* `limit` (default unlimited) - how many rows to return before stopping


## createChangesStream

```js
var changes = db.createChangesStream([opts])
```

Returns a read stream that iterates over the dat store change log (a log of all CRUD in the history of the database).

Changes are emitted as JS objects that look like `{change: 352, key: 'foo', version: 2}`

### Options

* `data` (default `false`) - if true will `get` the row data at the change version and include it `change.value`
* `since` (default `0`) - change ID to start from
* `tail` (default `false`) - if true it will set `since` to the very last change so you only get new changes
* `limit` (default unlimited) - how many changes to return before stopping
* `live` (default `falss`) - if true will emit new changes as they happen + never end (unless you manually end the stream)

## createWriteStream

```js
var writeStream = db.createWriteStream([opts])
```

Returns a new write stream. You can write data to it. For every thing you write it will write back the success/fail status as a JS object.

You can write:

- raw CSV (e.g. `fs.createReadStream('data.csv')`)
- raw line separated JSON objects
- JS objects (e.g. `objectMode`)

### Options

* `format` (defaults to `objectMode`), set this equal to `json`, `csv`, or `protobuf` to tell the write stream how to parse the data you write to it
* `csv` - raw CSV data. setting to true is equivalent to `{format: 'csv'}`
* `json` - line-delimited JSON objects. setting to true is equivalent to `{format: 'json'}`
* `protobuf` - protocol buffers encoded binary data. setting to true is equivalent to `{format: 'protobuf'}`
* `primary` (default `key`) - the column or array of columns to use as the primary key
* `hash` (default `false`) - if true `key` will be set to the md5 hex hash of the string of the primary key(s)
* `primaryFormat` - a function that formats the key before it gets inserted. accepts `(val)` and must return a string to set as the key.
* `columns` - specify the column names to use when parsing multibuffer/csv. Mandatory for multibuffer, optional for csv (csv headers are automatically parsed but this can be used to override them)
* `headerRow` (default `true`) - set to false if your csv doesn't have a header row. you'll also have to manually specify `columns`
* `separator` (default `,`) - passed to the csv parser
* `delimiter` (default `\n`) - passed to the csv parser

## createVersionStream

```js
var versions = db.createVersionStream(key, [opts])
```

Returns a read stream that emits all versions of a given key

### Options

* `start` (default 0) - version to start at
* `end` (default infinity) - version to stop at

## createBlobWriteStream

```js
var blobWriter = db.createBlobWriteStream(filename, [row], [cb])
```

Returns a writable stream that you can stream a binary blob into. Calls `cb` with `(err, updated)` where `updated` is the new version of the row that the blob was attached to.

`filename` may be either simply a string for the filename you want to save the blob as, or an options object e.g. `{filename: 'foo.txt'}`. `filename` will get passed to the underlying blob store backend as the `options` argument.

If specified `row` should be a JS object you want to attach the blob to, obeying the same update/conflict rules as `db.put`. If not specified a new row will be created.

## createBlobReadStream

```js
var blobWriter = db.createBlobReadStream(key, filename, [options])
```

Returns a readable stream of blob data.

`key` is the key of the row where the blob is stored. `filename` is the name of the attached blob. both are required.

### Options

* `version` (default latest) - the version of the row to get

## listen

```js
dat.listen([port], [cb])
```

Starts the dat HTTP server. `port` defaults to `6461` or the next largest available open port, `cb` gets called with `(err)` when the server has started/failed.

## clone

```js
dat.clone(remote, [cb])
```

Initializes a new dat (if not already initialized) and makes a local replica of `remote` in the folder where dat was instantiated. May be faster than `dat.pull` if the remote server has faster clone capabilities (e.g. hyperleveldb's `liveBackup`)

## push

```js
dat.push(remote, [cb])
```

Synchronizes local dat with a remote dat by pushing all changes to the remote dat over HTTP. Calls `cb` with `(err)` when done.

`remote` should be the base HTTP address of the remote dat, e.g. `http://localhost:6461`


## pull

```js
dat.push(remote, [cb])
```

Synchronizes local dat with a remote dat by pushing all changes to the remote dat over HTTP. Calls `cb` with `(err)` when done.

`remote` should be the base HTTP address of the remote dat, e.g. `http://localhost:6461`

### Options

* `live` (default `false`) - if true will keep the pull open forever and will receive new changes as they happen from the remote
* `quiet` (default `false`) - if true will suppress progress messages

## init

```js
dat.init(path, [cb])
```

Creates a new empty dat folder and database at `path/.dat`. This method is called by default when you create a dat instance.

## paths

```
var paths = dat.paths(path)
```

Returns an object with the various absolute paths (calculated using `path` as the base dir) for different parts of dat, e.g. the `.dat` folder, the leveldb folder, the blob store. 

## exists

```
dat.exists(path, cb)
```

Checks if `path` has a dat store in it. Calls `cb` with `(err, exists)` where `exists` is a boolean.

## close

```js
dat.close(cb)
```

Closes the http server, RPC client (if present), database and cleans up the `.dat/PORT` file. Calls `cb` with `(err)` when done.

## destroy

```js
dat.destroy(path, cb)
```

Calls `.close` and then destroys the `.dat` folder in `path`. Calls `cb` with `(err)` when done.

## cat

```js
dat.cat()
```

Prints a line separated JSON serialized version of a `dat.createReadStream()` (the newest version of all rows) to stdout.

## dump

```js
dat.dump()
```

Prints the raw encoded key/value data from leveldb to stdout as line separated JSON. Used for debugging.

## getRowCount

```js
var number = dat.getRowCount()
```

Returns the current number of rows in the db.

## headers

```js
var headers = dat.headers()
```

Returns an array of all the current column names in the db. Used for generating CSVs.

## config

```js
dat.config(path, cb)
```

Parses the contents of `.dat/dat.json` for the dat at `path` and calls `cb` with `(err, config)`.

# Utility methods

## normalizeURL
## supportsLiveBackup
## resultPrinter
## progressLogStream
## dbOptions
## defaultPort

# Internal methods

## _level
## _storage
## _ensureExists
## _sleep
## _mkdir

