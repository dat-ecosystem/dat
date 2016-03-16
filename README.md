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
$ cd mydata/
$ dat link
Creating share link for 4 files in 1 directories. 18.54 kB total.
dat://9d011b6c9de26e53e9961c8d8ea840d33e0d8408318332c9502bad112cad9989
Serving data on port 3282 (0 connections)
```

You are now publishing that data from your computer and it will be publicly accessible as long as your terminal is open. Your friend can get that data like this:

```
$ dat dat://9d011b6c9de26e53e9961c8d8ea840d33e0d8408318332c9502bad112cad9989
```

It will start downloading the data into the current location. It will also upload that data to others as long as the terminal is open. Anyone who gets access to the unique dat link will be able to download and re-host a copy of the data. It's distributed mad science!

For more information, see the [full project documentation here](http://dat-data.readthedocs.org).
