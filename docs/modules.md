# Modules We Use

Here is a rundown of some of the dependencies that we use in dat. Some of them were written for dat and some were pre-existing. List is in roughly alphabetical order.

## [JSONStream](http://npmjs.org/JSONStream)

This streaming JSON parser/stringifier is really nice for working with JSON data that is arbitrarily large and may not fit in memory (e.g. where `JSON.parse` is either too slow or crashes). We use the stringifier functionality in dat to produce JSON output in the dat REST API, e.g.:

```js
dat.createValueStream().pipe(jsonStream.stringify('{"rows": [\n', '\n,\n', '\n]}\n')).pipe(res)
```


## [ansimd](http://npmjs.org/ansimd)

This module converts markdown to ANSI formatted output. When you type `dat help` on the CLI you get nicely formatted output thanks to this module.

## [basic](http://npmjs.org/basic)

A really nice and small module we use as a building block for implementing HTTP Basic Authentication in dat.

## [byte-stream](http://npmjs.org/byte-stream)

We wrote this to help increase the bulk write performance with LevelDB. It is a stream that will group buffers into a group with a cumulative byte size limit, which is useful when writing data using the LevelDB Batch API. You can [learn more here](https://github.com/maxogden/level-bulk-load).

## [concat-stream](http://npmjs.org/concat-stream)

This is a small utility stream for buffering all the output from a stream into one buffer. We use this all over the place in the dat test suite as well as in a few places in the dat implementation itself.

## [connections](http://npmjs.org/connections)

We wrote this to keep track of active HTTP connections to the dat HTTP server.

## [content-addressable-store](http://npmjs.org/content-addressable-store)

This module implements a similar on-disk content addressable object store to git. We use it as the default backend for the dat blob store.

## [cookie-cutter](http://npmjs.org/cookie-cutter)

A really nice small module for reading cookies from HTTP requests

## [corsify](http://npmjs.org/corsify)

This module makes it easy to add CORS support to HTTP servers. We use it to make the dat REST API fully CORS enabled.

## [csv-parser](http://npmjs.org/csv-parser)

We wrote this CSV parser because we needed high performance and a simple API. 

## [csv-write-stream](http://npmjs.org/csv-write-stream)

We wrote this streaming csv generator because we needed something that could stream out valid CSV data for datasets that could be larger than available RAM.

## [csv-spectrum](http://npmjs.org/csv-spectrum)

We wrote this CSV test suite + collection of test data to ensure that our CSV parser handles all the possible edge cases seen in CSV files in the wild. You can use csv-spectrum to improve the robustness of csv parsers in any language.

## [cuid](http://npmjs.org/cuid)

We use this to generate unique keys. It's a pretty interesting approach to UUIDs.

## [dat-editor](http://npmjs.org/dat-editor)

This is our front-end interface web app that you see when you open up a dat server address in your browser.

## [dat-replicator](http://npmjs.org/dat-replicator)

This module encapsulates our push and pull replication logic and creates replication stream using the `dat-replication-protocol` module.

## [dat-replication-protocol](http://npmjs.org/dat-replication-protocol)

This is a streaming parser/encoder that converts data from the dat JS API into network serializable formats.

```
TODO
    "dat-replicator": "^0.7.2",
    "debug": "~0.7.4",
    "debug-stream": "^2.0.0",
    "duplexer2": "0.0.2",
    "duplexify": "^3.0.1",
    "execspawn": "^0.2.0",
    "extend": "~1.2.1",
    "getport": "~0.1.0",
    "head-stream": "~0.0.4",
    "isnumber": "^1.0.0",
    "ldjson-stream": "~1.0.0",
    "level-events": "^1.0.2",
    "level-js": "^2.1.3",
    "level-live-stream": "~1.4.9",
    "level-manifest": "~1.2.0",
    "level-mutex": "~0.7.0",
    "leveldown-prebuilt": "~0.10.2",
    "levelup": "~0.18.2",
    "lexicographic-integer": "~1.1.0",
    "minimist": "~0.2.0",
    "mkdirp": "~0.3.5",
    "multibuffer": "~2.2.0",
    "multibuffer-stream": "~2.1.0",
    "multilevel": "~5.5.0",
    "peek-stream": "^1.1.1",
    "pretty-bytes": "^0.1.1",
    "protocol-buffers": "^0.4.1",
    "pumpify": "^1.2.1",
    "read": "^1.0.5",
    "request": "~2.27.0",
    "resolve": "^0.7.1",
    "rimraf": "~2.2.2",
    "routes-router": "~1.5.3",
    "single-line-log": "^0.3.1",
    "sleep-ref": "^1.1.0",
    "speedometer": "^0.1.2",
    "stdout": "0.0.3",
    "stdout-stream": "~1.2.0",
    "stream-combiner": "~0.0.2",
    "stream-splicer": "^1.1.0",
    "through2": "~0.4.1",
    "write-transform-read": "^1.0.0"
```