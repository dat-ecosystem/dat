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

## createBlobWriteStream
## createWriteStream
## createVersionStream

## serve
## push
## pull
## clone

## init
## paths
## exists
## close
## destroy

## cat
## dump

## getRowCount
## headers
## level
## backend
## config
## normalizeURL
## supportsLiveBackup
## resultPrinter
## progressLogStream
## dbOptions
## defaultPort
## _storage
## _ensureExists
## _sleep
## _mkdir

