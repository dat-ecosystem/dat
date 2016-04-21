# dat

Dat is a decentralized data tool for distributing datasets small and large.

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![docs](https://readthedocs.org/projects/pip/badge/?version=latest)](http://dat-data.readthedocs.org)


Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](https://api.travis-ci.org/maxogden/dat.svg)](https://travis-ci.org/maxogden/dat)


This is the Dat 1.0 pre-release candidate. We want to make Dat into a data versioning, forking, and syncing tool. The first feature set we are working on is easy file distribution.

Key features:

  * **Distribute large files** without copying data to a central server.
  * **Intelligently sync** by deduplicating data between versions.
  * **Swarm data** by connecting those who want data with those who already have it.
  * **Verify data integrity** using strong cryptographic hashes.
  * **Work everywhere**, including in the [browser](http://github.com/karissa/dat-browserify), on the [desktop](http://github.com/karissa/dat-desk), as well as in R and [python](http://github.com/karissa/datpy).

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

Go into a directory and type

```
$ dat link mydata/
Creating Dat Link (7 files, 1 folders, 3.92 MB total)
[Done] MFGEmployees4.csv
[Done] MFGAbsences-part2.r
[Done] MFGAbsences-part1.R
[Done] Absenteeism-Part2.pdf
[Done] Absenteeism-Part2.Rmd
[Done] Absenteeism-Part1.pdf
[Done] Absenteeism-Part1.Rmd
[Done] 7 of 7 files (3.92 MB of 3.92 MB)
[Sharing] dat://4190f843d69ce8e38e28f166798a9b03c1ba6c65a504511b1d24be12bd150f14
```

You are now serving that data from your computer over a peer to peer network.

Copy the dat URL (`dat://..`). Anyone can now download that data by using `dat`

```
$ dat dat://somehash mydata
Downloading Data (399 files, 41 folders, 1.68 GB total)
$ 
```

Dat will start downloading the data into `downloads`.

You can see the progress of your download by typing
```
$ dat status
[active]
/Users/karissa/Downloads
dat://ed46e4f34d8d0ac851662e95f0e86a34fbd01dd0edc11dfdedc591dd37b2ed1a
[ 29%] 20 of 399 files (503.52 MB of 1.68 GB)
1.68 GB
```

You can share some more data:

```
$ dat link /path/to/some/more/data
Creating Dat Link (1 files, 2 folders, 83.66 MB total)
[Done] atom-mac.zip
[Done] 1 of 1 files (83.66 MB of 83.66 MB)
[Sharing] dat://ed46e4f34d8d0ac851662e95f0e86a34fbd01dd0edc11dfdedc591dd37b2ed1a
```

And see the status of your local dats:

```
$ dat status
[Active]
/Users/karissa/Downloads/People Analytics - An Example Using R
dat://4190f843d69ce8e38e28f166798a9b03c1ba6c65a504511b1d24be12bd150f14
 8 of 8 files (3.92 MB of 3.92 MB)

[Active]
/Users/karissa/Downloads/data
dat://ed46e4f34d8d0ac851662e95f0e86a34fbd01dd0edc11dfdedc591dd37b2ed1a
1 of 1 files (83.66 MB of 83.66 MB)
```

Stop sharing a dat to the public:

```
$ dat stop /Users/karissa/Downloads/data
[Success] Stopped serving /Users/karissa/Downloads/data
```

Stop sharing all dats:
```
$ dat stop
This will stop 2 dats. Are you sure? [y/n]: y
[Success] Stopped serving 2 dats.
```

For more information, see the [full project documentation here](http://dat-data.readthedocs.org).
