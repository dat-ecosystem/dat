# dat programmatic API

`dat` is a node module that you can require with e.g. `var dat = require('dat')`

## Create a dat instance

```js
var db = dat([path], [options])
```

Returns a new dat instance and either opens the existing underlying database or creates a new empty one. All arguments are optional. 

`path` is the path to the folder inside of which dat should put it's `.dat` folder. If a `.dat` folder already exists there dat will open the existing dat store, otherwise a new one will be created. If not specified it will use `process.cwd()`

When the dat instance is ready it will emit events `.on('ready')` and `.on('open')` (these are equivalent).

### Options

* `path` (default `process.cwd()`) - if not specified as the first argument to the constructor it will check `options.path` instead
* `leveldown` (default `require('leveldown-prebuilt')`) - pass in a custom leveldown backend
* `db` - pass in a custom levelup instance. if specified the `leveldown` option will be ignored, and your tabular data will be stored entirely in the `db` instance you pass in
* `blobs` (default `require('lib/blobs.js')`) - pass in a custom blob store
* `skim` - TODO decide on semantics
* `feed` - pass in a custom [changes-feed](https://www.npmjs.com/package/changes-feed) instance
* `merge` - pass in a custom merge resolution function

## db.head

A string property available on the db instance containing the latest stable version hash.

## db.status

A string representing the current status of this Dat.

Possible values are:

- *"new"*      - newly created, not opened or closed
- *"opening"*  - waiting for the database to be opened
- *"open"*     - successfully opened the database, available for use
- *"conflict"* - the database has entered conflict mode and conflicts must be resolved or aborted
- *"closing"*  - waiting for the database to be closed
- *"closed"*   - database has been successfully closed, should not be used

## db.on

An event emitter instance to hook into Dat status changes with.

Each `db.status` will be emitted as an event, e.g. `db.on('conflict')`.

Additionally there is an `error` event for listening for critical errors.

**Note** `conflict` is a special, mandatory event. If you do not handle it (e.g. you do not have a `on('conflict')` event bound or you do not have a `merge` function registered with the db) then the db will emit an `error` event if it enters conflict mode.

## db.createChangesStream

```js
var changes = db.createChangesStream([opts])
```

Returns a read stream that iterates over the dat store change log (a log of all CRUD in the history of the database).

Changes are emitted as JS objects that look like `{change: 352, key: 'foo', version: 2}`

- `change` - the *local* change number (auto-incrementing) that should only be used for local operations such as secondary indexing. This number does not get replicated and will vary in distributed use cases.
- `key` - the key of the row related to this change
- `version` - the version hash at the time of this change
- `links` - the previous changes in the change graph that this change points to


Example response
```
{ "change": 13, "key": "foo", "hash": "b342df", "from": 0, "to": 1}
{ "change": 14, "key": "foo", "hash": "a3bc5f", "from": 1, "to": 2}
```

*mafintosh: there is no guarantee that the 'change', 'from', and 'to' local numbers are the same across multiple dats. the only guarantee is that all the dependencies for a specific entry in the change feed (previous nodes in the graph) have a lower change number*

### Options

* `values` (default `false`) - if true will `get` the row data at the change version and include it `change.value`
* `since` (default `0`) - local `change` number to start from
* `tail` (default `false`) - if true it will set `since` to the very last change so you only get new changes
* `limit` (default unlimited) - how many changes to return before stopping
* `live` (default `false`) - if true will emit new changes as they happen + never end (unless you manually end the stream)

## db.createConflictStream

```js
db.createConflictStream(opts)
```

Returns a new readable object stream that emits conflicts. If you are not in conflict mode the stream will immediately end.

The object that gets emitted will be an objects with these properties:

- `key` - the key for this conflict
- `dataset` - the dataset name for this conflict
- `versions` - an array of objects, each object is a different conflicted version in the same format as what is returned by `dataset.get`

If specified, `opts` can have these properties:

- `format` (default `objectMode`) - if set to `csv`, `json` or `protobuf` the stream will not be an object mode stream and will emit serialized data

## db.merge

```js
db.merge(versions, value, cb)
```

Resolve multiple versions of a conflicted row into a new single merged version.

- `versions` (required) an array of version hash strings *or* objects to merge (see below)
- `value` (required) the new value to store
- `cb` (optional) called when done with `(err, updated)` where `updated` is the new version of the row that was stored (same format as what you get from `dataset.get`)

If `versions` is an array of strings, it should be the hashes of the versions you want to merge. If it is an array of objects, the objects should be the same format as what you get back from `createConflictStream`.

## db.createMergeStream

```js
db.createMergeStream(opts)
```

Returns a writable object stream. Each object you write will be merged using the same semantics as `db.merge`. This makes it possible to implement streaming merge pipelines externally from Dat for automation purposes.

The objects must have these properties:

- `versions` (required) an array of version hash strings *or* objects to merge
- `value` (required) the new value to store

## db.rollback

```js
db.rollback(version, cb)
```

Performs a **destructive** (repeat: **destructive**) rollback to the state at `version` and calls `cb` when done with `(err)`. 



## dataset

```js
var dataset = db.dataset(name, [opts])
```

example

```js
var dataset = db.dataset('salaries')
```

Creates a namespaced 'collection' for a set of data. Creating a dataset is required before you can put any data into dat. All data must be stored in a dataset.

## dataset.get

```js
dataset.get(key, [options], cb)
```

example:

```js
dataset.get(whatever, function cb(err, obj) {
  // if err exists it will be some type of DatError
  // {type: 'file', dataset: 'salaries', 'key': 'photo', version: '324i2h3i4b2iu', value: {foo: 'bar'}}
})
```

Gets a key, calls callback with `(error, value)`. `value` is a JS object that will have these keys:

* `key` - a string
* `value` - a JS object with the data stored at this `key`
* `version` - the version hash of the row
* `type` - a string of the type, usually `row` or `file`

### Options

* `version` (defaults to latest) - gets row at specific checkout, e.g. `{version: '2bi42oujb3'}`
* `checkout` (defaults to latest) - gets row at specific checkout, e.g. `{checkout: '23b4u234u2'}`

`version` is the version of the row (it must exist) and `checkout` is the version of the dataset (it gets closest older version of the row from the checkout point)

## dataset.put

```js
dataset.put(key, value, cb)
```

Puts value into the database by key. Key must be a string.

`cb` will be called with `(error, newVersion)` where `newVersion` will be be a JS object (the same as what you get back from a `.get`).

All versions of all rows are persisted and replicated.

## dataset.delete

```js
dataset.delete(key, cb)
```

Marks `key` as deleted. Note: does not destroy old versions. Calls `cb` with `(err, deletedRow)`

`deletedRow` is a JS object, the same as what you get back from `.get`, except the `value` property will be `null`. The `version` property will be a new hash.

Note: Deleting the row of a `type: 'file'` will also delete the file it references in the blob store.

## dataset.createReadStream

```js
var readStream = dataset.createReadStream([opts])
```

Returns a readable stream over the most recent version of all rows in the dataset.

Rows are returned in the same format as `.get`.

### Options

* `gt`, `gte`, `lt`, `lte` - greater than/less than sort strings for controlling the readstream start/end positions (inclusive and exclusive).
* `limit` (default unlimited) - how many rows to return before stopping
* `reverse` (default false) - if `true` returns in reverse-lexicographic sorting order
* `type` (default all) - specify a single type to return, e.g. `type: 'file'` to get only file metadata back. Note that this simply filters the results, a full table scan will still be performed.

## createValueStream

```js
var valueStream = db.createValueStream([opts])
```

Returns a read stream over the most recent version of all rows in the dat store that returns only the values stored.

By default the returned stream is a readable object stream that will emit 1 JS object per row (equivalent to the `.value` object returned by `createReadStream`).

You can also pass in options to serialize the values as either CSV or line-delimited JSON (see below).

### Options

* `gt`, `gte`, `lt`, `lte` - greater than/less than sort strings for controlling the readstream start/end positions (inclusive and exclusive).
* `limit` (default unlimited) - how many rows to return before stopping
* `reverse` (default false) - if `true` returns in reverse-lexicographic sorting order
* `format` (default `objectMode`) - if set to `csv`, `json` or `protobuf` the stream will not be an object mode stream and will emit serialized data

## dataset.createKeyStream

```js
var keyStream = db.createKeyStream([opts])
```

Returns a readable stream over the most recent version of all keys in the dat store that returns only the keys stored. This method does not decode values and exists for mostly performance reasons.

By default the returned stream is a readable object stream that will emit 1 JS object per row in the form `{key: key, version: number}`. 

### Options
* `gt`, `gte`, `lt`, `lte` - greater than/less than sort strings for controlling the readstream start/end positions (inclusive and exclusive).
* `limit` (default unlimited) - how many rows to return before stopping
* `reverse` (default false) - if `true` returns in reverse-lexicographic sorting order

## dataset.createWriteStream

```js
var writeStream = db.createWriteStream([opts])
```

Returns a new writable stream. You can write data to it.

Supported types (if you set the `format` option correctly) are:

- `object` - JS objects (default) e.g. `objectMode: true` in node streams
- `csv`- raw CSV (e.g. `fs.createReadStream('data.csv')`)
- `json` - raw [newline separated JSON objects](http://ndjson.org/)
- `protobuf` - protocol buffers encoded binary data

### Options

* `format` (defaults to `object`), set this equal to `json`, `csv`, or `protobuf` to tell the write stream how to parse the data you write to it
* `key` (default `key`) - the column or array of columns to use as the primary key
* `keyFormat` - a function that formats the key before it gets inserted. accepts `(val)` and must return a string to set as the key.
* `columns` - specify the column names to use when parsing CSV. CSV headers are automatically parsed but this can be used to override them
* `headerRow` (default `true`) - set to false if your csv doesn't have a header row. you'll also have to manually specify `columns`
* `separator` (default `,`) - passed to the csv parser
* `delimiter` (default `\n`) - passed to the csv parser

## dataset.createVersionStream

```js
var versions = dataset.createVersionStream(key)
```

Returns a read stream that emits all versions of a given key. 

TODO determine possible options

## dataset.createFileWriteStream

```js
var blobWriter = dataset.createFileWriteStream(key, [rowData], [cb])
```

Returns a writable stream that you can stream a binary blob into. Calls optional `cb` with `(err, updated)` where `updated` is the new version of the row that the blob was attached to.

`key` is the same as the `key` in `.put` - it must be a string.

If specified `row` should be a JS object with any data you want to store, the same as data in `.put`.

## dataset.createFileReadStream

```js
var blobReader = dataset.createFileReadStream(key, [options])
```

Returns a readable stream of file data.

`key` is the key of the row where the blob is stored. `filename` is the name of the attached blob. both are required.

### Options

* `version` (default latest) - the version of the file to get

# Replication

## db.createPushStream

```js
db.createPushStream([opts])
```

Returns a duplex replication stream that you can pipe over a transport stream to a remote replication endpoint. Pushes local data into remote.

### Options

TODO decide on options

## db.createPullStream

```js
db.createPullStream([opts])
```

Returns a duplex replication stream that you can pipe over a transport stream to a remote replication endpoint. Pulls data from remote and merges into local.

### Options

TODO decide on options

## db.createSyncStream([opts])

Returns a duplex replication stream that you can pipe over a transport stream to a remote replication endpoint. Does both a push and a pull.

### Options

TODO decide on options

## db.open

```js
db.open(cb)
```

Makes sure the dat is ready and then calls the `cb` with `(err)` if there was an error. If there was no error the dat is ready to use. Will cause the ready/open events to be emitted.

## db.close

```js
db.close(cb)
```

Closes the dat and any underlying storage/network interfaces. Calls `cb` with `(err)` when done.

## db.info

```js
db.info(cb)
```

Gets information about the database and calls `cb` with `(err, info)`.

`info` will be a JS object with these properties:

- `datasets` - an object containing information about each dataset in this dat
- `datasets[datasetName]` - an object with these properties
  - `rowCount` - the number of rows in this dataset
  - `fileCount` - the number of files in this dataset
  - `schema` - the `.proto` formatted protocol buffers string schema
- `changeCount` - the overall number of changes in the history
- `meta` - a JS object that has the data from `dat.json`


