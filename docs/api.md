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

## todo

help

get
put
delete
createReadStream
createChangesStream
createBlobWriteStream
createWriteStream
createVersionStream

serve
push
pull
clone

init
paths
exists
close
destroy

cat
dump

getRowCount
headers
level
backend
config
normalizeURL
supportsLiveBackup
resultPrinter
progressLogStream
dbOptions
defaultPort
_storage
_ensureExists
_sleep
_mkdir
