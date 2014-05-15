# dat API

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
* `backend` (default `require('leveldown-prebuilt')`) - pass in a custom leveldown backend
* `blobs` (default `require('lib/blobs.js')`) - pass in a custom blob store
* `replicator` (default `require('lib/replicator.js')`) - pass in a custom replicator
* `serve` (default `true`) - if `false` then dat will not start a local http server automatically
* `port` (default `6461`) - the port to listen on if starting the http server
* `remoteAddress` (default `undefined`) - if specified then dat will run in RPC client mode
* `manifest` (default `undefined`) - if `remoteAddress` is also true this RPC manifest object will be used by `multilevel.client`

note: the `options` object also gets passed to the `levelup` constructor

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
db.put([json], [buffer], [opts], [cb])
```

Puts JSON into the database by key. Specify the key you want by setting it as `json.id`, e.g. `db.put({id: 'bob'} ... )`.

`cb` will be called with `(error, newVersion)` where `newVersion` will be be a JS object with `id` and `version` properties.

If something already exists in the database with the key you specified you may receive a conflict error. To ensure you do not overwrite data accidentally you must pass in the current version of the key you wish to update, e.g. if `bob` is in the database at version 1 and you want to update it to add a `foo` key: `db.put({id: 'bob', version: 1, 'foo': 'bar'})`, which will update the row to version 2.

All versions of all rows are persisted and replicated.

If `buffer` is specified (and `Buffer.isBuffer(buffer)` is truthy) then instead of storing `json` as the value it will store whatever data is in `buffer` (only use this if you know what you are doing)

### Options

* `override` (default `false`) - if true it will bypass revision checking and overwrite any data that may already exist

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

### Options

* `start` (defaults to the beginning of the possible keyspace) - key to start iterating from
* `end` (defaults to the end of the possible keyspace) - key to stop iterating at
* `limit` (default unlimited) - how many rows to return before stopping
* `keys` (default `true`) - if false you won't get JS objects with k/v pairs but rather only the raw columnized values from the data store

Note: not all options from `levelup.createReadStream` are supported at this time

## createChangesStream

```js
var changes = db.createChangesStream([opts])
```

Returns a read stream that iterates over the dat store change log (a log of all CRUD in the history of the database).

Changes are emitted as JS objects that look like `{change: 352, id: 'foo', version: 2}`

### Options

* `data` (default `false`) - if true will `get` the row data at the change version and include it `change.data`
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

* `format` (defaults to multibuffer), set this equal to `json`, `objects`, `csv` to tell the write stream how to parse the data you write to it
* `csv` - setting to true is equivalent to `{format: 'csv'}`
* `json` - setting to true is equivalent to `{format: 'json'}`
* `objects` - setting to true is equivalent to `{format: 'objects'}`
* `primary` (default `id`) - the column or array of columns to use as the primary key
* `hash` (default `false`) - if true `id` will be set to the md5 hex hash of the string of the primary key(s)
* `primaryFormat` - a function that formats the key before it gets inserted. accepts `(val)` and must return a string to set as the key.
* `columns` - specify the column names to use when parsing multibuffer/csv. Mandatory for multibuffer, optional for csv (csv headers are automatically parsed but this can be used to override them)
* `headerRow` (default `true`) - set to false if your csv doesn't have a header row. you'll also have to manually specify `columns`
* `separator` (default `,`) - passed to the csv parser
* `delimiter` (default `\n`) - passed to the csv parser

## createVersionStream

```js
var versions = db.createVersionStream(id, [opts])
```

Returns a read stream that emits all versions of a given key

### Options

* `start` (default 0) - version to start at
* `end` (default infinity) - version to stop at

## createBlobWriteStream

```js
var blobWriter = db.createBlobWriteStream(filename, [row], [cb])
```

Returns a writable stream that you can stream a binary blob attachment into. Calls `cb` with `(err, updated)` where `updated` is the new version of the row that the blob was attached to.

`filename` may be either simply a string for the filename you want to save the blob as, or an options object e.g. `{filename: 'foo.txt'}`. `filename` will get passed to the underlying blob store backend as the `options` argument.

If specified `row` should be a JS object you want to attach the blob to, obeying the same update/conflict rules as `db.put`. If not specified a new row will be created.

## serve

```js
dat.serve([port], [cb])
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

## backend

```
dat.backend(backend, cb)
```

Switches levelup to use `require(backend)` as it's leveldown. Will install it from NPM if it isn't available and put it in `.dat/node_modules`. Calls `cb` with `(err)` when done. Before the backend gets loaded you have to close and re-instantiate the dat store.

## config
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

