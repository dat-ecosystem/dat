# dat

Dat is a decentralized data tool for distributing datasets small and large.

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![docs](https://readthedocs.org/projects/pip/badge/?version=latest)](http://dat-data.readthedocs.org)


Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/github/maxogden/dat?branch=master&svg=true)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](https://api.travis-ci.org/maxogden/dat.svg)](https://travis-ci.org/maxogden/dat)


This is the Dat 1.0 pre-release candidate. We want to make Dat into a data versioning, forking, and syncing tool. The first feature set we are working on is easy file distribution.

Key features:

  * **Live sync** folders by sharing files as they are added to the folder.
  * **Distribute large files** without copying data to a central server by connecting directly to peers.
  * **Intelligently sync** by deduplicating data between versions.
  * **Verify data integrity** using strong cryptographic hashes.
  * **Work everywhere**, including in the [browser](https://github.com/karissa/hyperdrive-ui) and on the [desktop](https://github.com/juliangruber/dat-desktop).

Dat embraces the Unix philosophy: a modular design with composable parts. All of the pieces can be replaced with alternative implementations as long as they implement the abstract API.

**Please note** that previous versions of Dat (alpha, beta) are incompatible with the 1.0 pre-release.

## Install

To install the 1.0 Pre-release from npm:

```
npm install dat -g
```

If you receive an `EACCES` error read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

#### Installing from source

Clone this repository and in a terminal inside of the folder you cloned run this command:

```
npm link
```

This should add a `dat` command line command to your PATH. Now you can run the `dat` command to try it out.

## Getting started

There are two main commands in dat:

1. Share data: `dat <directory>`
2. Download data: `dat <dat-link> <download-directory>`

Share a directory by typing `dat <directory>`:

```
$ dat my_data/
Initializing Dat in my_data/
[DONE] readme.txt (0.30 kB)
[DONE] data.csv (1.14 kB)
Items: 2  Size: 1.44 kB
Share Link 4f36c088e9687ddf53d36f785ab84c65f4d24d8c4161950519b96a57d65ae08a
The Share Link is secret and only those you share it with will be able to get the files
Sharing /Users/joe, connected to 2/4 sources
Uploading 28.62 kB/s, 765.08 kB Total
```

You are now publishing that data from your computer. It will be publicly accessible as long as your terminal is open. The hash is a **secret hash**, your data is visible to anyone you send the hash to. As you add more files to the folder, dat will update and share the new files.

Your colleague can get that data like this:

```
$ dat 2bede435504c9482910b5d4e324e995a9bc4d6f068b98ae03d97e8d3ac5f80ea download_dir
Initializing Dat from 52d08a6d1ddc9b1f61b9862d2ae0d991676d489274bff6c5ebebecbfa3239f51
[DONE] readme.txt (0.30 kB)
[DONE] data.csv (1.14 kB)
[DONE] 2 items (1.44 kB)
Share Link 52d08a6d1ddc9b1f61b9862d2ae0d991676d489274bff6c5ebebecbfa3239f51
The Share Link is secret and only those you share it with will be able to get the files
Syncing live updates, connected to 1/2 sources
Download Finished, you may exit process
```

It will start downloading the data into the `download_dir` folder. Anyone who gets access to the unique dat link will be able to download and re-host a copy of the data. It's distributed mad science!

For more information, see the [full project documentation here](http://dat-data.readthedocs.org/).
