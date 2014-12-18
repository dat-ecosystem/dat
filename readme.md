# dat

Dat is an open source project that provides a streaming interface between every file format and data storage backend.

[The Dat Alpha release is out now](docs/dat-stable-alpha.md).

[![NPM](https://nodei.co/npm/dat.png?global=true)](https://nodei.co/npm/dat/)

Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)

## Installation

##### Step 1: Install node from the [node website](http://nodejs.org/).

You should have node version 0.10. You can check your node version by running `node -v` on the command line.
```
$ node -v
v0.10...
```

##### Step 2: Install dat

```
npm install dat -g
```

The `-g` means "install globally" which makes the `dat` command available in your command line path.

If it all worked correctly, you should see this when you type `dat`.
```
$ dat
Usage: dat <command> [<args>]

where <command> is one of:
  cat
  export
  import
  init
  help
  version
  pull
  push
  clean
  clone
  serve
  listen
  blobs
  rows

Enter 'dat <command> -h' for usage information
For an introduction to dat see 'dat help'
```

## First time here?

Welcome! You should do one of two things (or both if you feel like it). If you want to get started with a dat now, take a look at the [getting started guide](https://github.com/maxogden/dat/blob/master/docs/getting-started.md).

If you just want to learn about how dat works, we have prepared an in-browser workshop: [http://maxogden.github.io/get-dat](http://maxogden.github.io/get-dat)

To learn more about how dat deals with data, you should check out our [data importing guide](https://github.com/maxogden/dat/blob/master/docs/importing.md).

## Troubleshooting
Dat is still in alpha. If you have any trouble, it's probably because we did something wrong!

Please tell us by [opening an issue here](http://github.com/maxogden/dat/issues/new) or asking us a question in #dat on IRC in freenode.

## About dat

The `dat` module is designed with a small-core philosophy. It defines an API for reading, writing and syncing datasets. It's written using Node and [a variety of modules](https://github.com/maxogden/dat/blob/master/docs/modules.md).

Internally dat has two kinds of data storage: tabular and blob. The default tabular data store is [LevelDB](http://leveldb.org) and the default blob store stores files on a [content-addressable blob store](https://github.com/mafintosh/content-addressable-blob-store). Both of these default backends can be swapped out for other backends.

* For high-level description read [what is `dat`?](https://github.com/maxogden/dat/blob/master/docs/what-is-dat.md)
* Curious about how we built dat? Read about the node [modules we used](https://github.com/maxogden/dat/blob/master/docs/modules.md)
* To learn about how replication works in detail check out [our replication guide](https://github.com/maxogden/dat/blob/master/docs/replication.md).

## APIs

- [command line](https://github.com/maxogden/dat/blob/master/docs/cli-usage.md)
- [REST (http)](https://github.com/maxogden/dat/blob/master/docs/rest-api.md)
- [JavaScript](https://github.com/maxogden/dat/blob/master/docs/js-api.md) with [examples](https://github.com/maxogden/dat/blob/master/docs/using-dat-from-node.md)
- *your module goes here*

## Building data pipelines

To help build data pipelines with dat we have a complementary tool called [gasket](https://github.com/datproject/gasket).

The best way to learn about gasket is to do the [data-plumber](https://www.npmjs.org/package/data-plumber) workshop.

## Developers

If it's broken, you can probably help fix it!

* Start by checking out our [help wanted issue tag](https://github.com/maxogden/dat/labels/help%20wanted).
* Help us with the module [wishlist](https://github.com/datproject/discussions/issues/5)! We hope to connect every database backend to dat, but we can't do it without your help!

You can install the latest development version with `git`:

```
git clone git://github.com/maxogden/dat.git
cd dat
npm install
npm link
```

## Get Involved

* Follow [@dat_project](https://twitter.com/dat_project) on twitter!
* Want to ask questions in IRC? Join `#dat` on freenode. Chat logs are [available here](https://botbot.me/freenode/dat/)
* Have any other questions/concerns? [Open an issue](https://github.com/maxogden/dat/issues)
* Suggest an organization that should be using `dat` to distribute their data -- we will help!


### BSD Licensed

Copyright (c) 2014 Max Ogden and contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
