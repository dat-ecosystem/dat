# dat

Dat is a decentralized data tool for distributing data small and large.

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![docs](https://readthedocs.org/projects/dat-cli/badge/?version=latest)](http://docs.dat-data.com)


Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/github/maxogden/dat?branch=master&svg=true)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](https://api.travis-ci.org/maxogden/dat.svg)](https://travis-ci.org/maxogden/dat)

## About Dat

Documentation for the Dat project is available at [docs.dat-data.com](http://docs.dat-data.com).

### Key features:

  * **Live sync** folders by sharing files as they are added to the folder.
  * **Distribute large files** without copying data to a central server by connecting directly to peers.
  * **Intelligently sync** by deduplicating data between versions.
  * **Verify data integrity** using strong cryptographic hashes.
  * **Work everywhere**, including in the [browser](https://github.com/datproject/dat.land) and on the [desktop](https://github.com/juliangruber/dat-desktop).

Dat embraces the Unix philosophy: a modular design with composable parts. All of the pieces can be replaced with alternative implementations as long as they implement the abstract API.

### Ways to Use Dat

  * [Dat CLI](https://github.com/maxogden/dat): command line tool
  * [Dat Desktop](https://github.com/juliangruber/dat-desktop/): desktop application
  * [dat.land](https://github.com/datproject/dat.land): website application

## CLI Development Status

This is the Dat CLI 1.0 release candidate (RC2). We are actively seeking feedback & developing this release candidate. Follow [this issue](https://github.com/datproject/projects/issues/5) for the Dat CLI road map discussion and see [known RC2 issues](https://github.com/maxogden/dat/issues/486).

**Please note** that previous versions of Dat (alpha, beta) are incompatible with the 1.0 release candidate.

## Getting started

### Install

To install the 1.0 release candidate from npm:

```
npm install dat -g
```

If you receive an `EACCES` error read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

### Using Dat

There are two main commands in dat:

1. Share data: `dat <directory>`
2. Download data: `dat <dat-link> <download-directory>`

### Sharing Files

Share a directory by typing `dat <directory>`:

```
$ dat my_data/
Sharing /Users/joe/my_data/

Share Link: d6e1875598fae25165eff440ffd01513197ad0db9dbb9898f2a141288b9322c6
The Share Link is secret and only those you share it with will be able to get the files

[==============>] Added 2 files (1.44 kB/1.44 kB)

Connected to 1 peers. Uploading 288.2 B/s. Watching for updates...
```

You are now publishing that data from your computer. It will be publicly accessible as long as your terminal is open. The hash is a **secret hash**, your data is visible to anyone you send the hash to. As you add more files to the folder, dat will update and share the new files.

### Downloading Files

Your colleague can get data like this:

```
$ dat d6e1875598fae25165eff440ffd01513197ad0db9dbb9898f2a141288b9322c6 download_dir
Downloading in /Users/joe/download_dir

Share Link: d6e1875598fae25165eff440ffd01513197ad0db9dbb9898f2a141288b9322c6
The Share Link is secret and only those you share it with will be able to get the files

[==============>] Downloaded 3 files (1.44 kB/1.44 kB)

Connected to 1 peers. Downloading 1.44 kB/s. Watching for updates...
```

It will start downloading the data into the `download_dir` folder. Anyone who gets access to the unique dat-link will be able to download and re-host a copy of the data. It's distributed mad science!

For more information, see the [Dat CLI documentation](http://dat-cli.readthedocs.org/) or the [dat project documentation](http://docs.dat-data.com).


## Development

Please see [guidelines on contributing](https://github.com/maxogden/dat/blob/master/CONTRIBUTING.md) before submitting an issue or PR.

### Installing from source

Clone this repository and in a terminal inside of the folder you cloned run this command:

```
npm link
```

This should add a `dat` command line command to your PATH. Now you can run the `dat` command to try it out.

The contribution guide also has more tips on our [development workflow](https://github.com/maxogden/dat/blob/master/CONTRIBUTING.md#development-workflow).


### Internal API

**Note: we are in the process of moving the main library to a separate module, [joehand/dat-js](https://github.com/joehand/dat-js). Temp documentation here for developers.**

#### dat.download(cb)

download `dat.key` to `dat.dir`

#### dat.share(cb) 

share directory specified in `opts.dir`

Swarm is automatically joined for key when it is available for share & download (`dat.joinSwarm()`).

#### Events

##### Initialization

* `dat.on('ready')`: db created/read & hyperdrive archive created.
* `dat.on('error')`: init/database error

##### Swarm

Swarm events and stats are available from `dat.swarm`.

* `dat.on('connecting')`: looking for peers
* `dat.on('swarm-update')`: peer number changed

##### Share

* `dat.on('key')`: key is available (this is at archive-finalized for snapshots)
* `dat.on('append-ready')`: file count available (`dat.appendStats`), about to start appending to hyperdrive
* `dat.on('file-added')`: file added to archive
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('archive-finalized')`: archive finalized, all files appended
* `dat.on('archive-updated')`: live archive changed

##### Download

* `dat.on('key')`: key is available
* `dat.on('file-downloaded', file)`: file downloaded
* `dat.on('download', data)`: piece of data downloaded
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('download-finished')`: archive download finished

#### Other API

* `dat.key`: key
* `dat.dir`: directory
* `dat.datPath`: path to .dat folder
* `dat.db`: database instance
* `dat.swarm`: hyperdrive-archive-swarm instance
* `dat.archive`: hyperdrive archive
* `dat.snapshot` (boolean): sharing snapshot archive

#### Internal Stats
```javascript

dat.stats = {
    filesTotal: 0, // Latest archive size
    bytesTotal: 0,
    bytesUp: 0,
    bytesDown: 0,
    rateUp: speedometer(),
    rateDown: speedometer()
}

// Calculated on share before append starts. Used for append progress.
// Not updated for live.
dat.appendStats = {
    files: 0,
    bytes: 0,
    dirs: 0
}
```
