# Modules We Use

Here is a rundown of some of the dependencies that we use in dat as well as a few complementary modules that we use/developed. Some of them were written for dat and some were pre-existing. List is in roughly alphabetical order. Not listed here are some popular dependencies that you probably already know.

As of the time of this writing we use a total of 524 modules in the entire dat dependency graph (`npm ls --parseable | wc -l`). This file documents the top level dependencies (of which there are 55).

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

## [duplexify](http://npmjs.org/duplexify)

We use this to build APIs that immediately return stream instances but actually asynchronously wrap underlying readable/writable streams. Duplexify also does proper cleanup on the substreams when the parent stream closes/ends/gets destroyed.

## [debug-stream](http://npmjs.org/debug-stream)

This lets us extend the idea of the popular [debug](http://npmjs.org/debug) to help us debug streams.

## [gasket](http://npmjs.org/gasket)

We wrote `gasket` to make building and sharing streaming data processing pipelines easier. We also wrote a NodeSchool workshop that teaches streaming data processing and gasket called [data-plumber](https://www.npmjs.org/package/data-plumber)

## [getport](http://npmjs.org/getport)

Gets an open port for binding the dat http server during `dat listen`

## [isnumber](http://npmjs.org/isnumber)

Returns true if a value is a non-infinite number, otherwise false

## [JSONStream](http://npmjs.org/JSONStream)

This streaming JSON parser/stringifier is really nice for working with JSON data that is arbitrarily large and may not fit in memory (e.g. where `JSON.parse` is either too slow or crashes). We use the stringifier functionality in dat to produce JSON output in the dat REST API, e.g.:

```js
dat.createValueStream().pipe(jsonStream.stringify('{"rows": [\n', '\n,\n', '\n]}\n')).pipe(res)
```

## [ndjson](http://npmjs.org/ndjson)

We wrote this to make working with streams of Line Delimited JSON easy.

## [level-events](http://npmjs.org/level-events)

We use this to instrument our LevelUP instance to produce performance statistics

## [level-js](http://npmjs.org/level-js)

We wrote this to make our LevelUP code (and ultimately all of dat) work in the browser. level-js works today but dat in the browser is a work in progress

## [level-live-stream](http://npmjs.org/level-live-stream)

This is used to produce the live changes feed feature in the dat REST API, and subsequently used for live pull/push replication.

## [level-mutex](http://npmjs.org/level-mutex)

Used to ensure that all operations to LevelDB are written in the correct + consistent order (AKA mutex locked).

## [leveldown-prebuilt](http://npmjs.org/leveldown-prebuilt)

We wrote this to replace the stock `leveldown` module with one that would use pre-built binaries of LevelDB so that 1) installs would be overall quicker and 2) users without native buildchains could still use dat. Uses the excellent [node-pre-gyp](https://www.npmjs.org/package/node-pre-gyp) and hosts the binaries on GitHub Releases.

## [lexicographic-integer](http://npmjs.org/lexicographic-integer)

Used to encode/decode integers into a lexicographically sortable representation, useful for auto-incrementing numbers in LevelDB indexes.

## [local-blob-store](http://npmjs.org/local-blob-store)

This module implements a similar on-disk content addressable object store to git. We use it as the default backend for the dat blob store, but you can use anything that supports the [abstract-blob-store](http://npmjs.org/abstract-blob-store) API.

## [multibuffer](http://npmjs.org/multibuffer)

We wrote this because we needed fast, efficient and simple buffer serialization solution

## [multibuffer-stream](http://npmjs.org/multibuffer-stream)

Uses `multibuffer` to produce encode/decode streams of buffers.

## [multilevel](http://npmjs.org/multilevel)

Used to implement the dat RPC API, which is used to allow multiple processes to access a single dat DB (ensures consistency and gets around the LevelDB single process lock)

## [peek-stream](http://npmjs.org/peek-stream)

We wrote this to help us inspect streams and decide asynchronously what to do with them, e.g. figuring out what type of data a `dat import` is.

## [pretty-bytes](http://npmjs.org/pretty-bytes)

Takes an integer and formats it as a nice size representation, e.g. `45MB`

## [protocol-buffers](http://npmjs.org/protocol-buffers)

We wrote this because we needed a fast + idiomatic library for parsing and encoding [Protocol Buffers](https://developers.google.com/protocol-buffers/)

## [pumpify](http://npmjs.org/pumpify)

Used to construct a single stream that internally wraps an array of streams

## [routes-router](http://npmjs.org/routes-router)

The URL router we use in the dat REST API. Part of the excellent [http-framework](https://www.npmjs.org/package/http-framework).

## [single-line-log](http://npmjs.org/single-line-log)

Used to easily write data to terminal in a way that overwrites the existing line rather than fill up the entire screen with data

## [speedometer](http://npmjs.org/speedometer)

Used to easily calculate bytes-per-second on various I/O streams.

## [stdout](http://npmjs.org/stdout)

Used to pipe non-ASCII streams to stdout/stderr. Really useful for debugging too!

## [stdout-stream](http://npmjs.org/stdout-stream)

We wrote this to replace piping to the synchronous `process.stdout` with one that is asynchronous.

## [through2](http://npmjs.org/through2)

We use this all over the place to easily construct custom streams

## [win-spawn](http://npmjs.org/win-spawn)

Used to write portable code for spawning processes with expected stdout/stderr behavior
