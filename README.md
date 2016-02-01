# dat

![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat--irc%20on%20freenode-blue.svg)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This is the Dat 1.0 Pre-release candidate. We want to make Dat into a data versioning, forking, and syncing tool. The first feature set we are working on is easy file synchronization. Dat embraces the Unix philosophy: a modular design with composable parts. All of the pieces can be replaced with alternative implementations as long as they implement the abstract API.

Key features:

  * **easily share large files** directly without having to copy them through a central server
  * **sync incrementally** between machines only the parts of files that change
  * **share data in a swarm** everyone who downloads data also helps upload to others
  * **automatic peer discovery** uses peer to peer techniques for finding copies of the data
  * **verify data integrity** data is verified using strong cryptographic hashes

**Please note** that previous versions of Dat (alpha, beta) are incompatible with the 1.0 pre-release.

## Install

To install the 1.0 Pre-release from npm:

```
npm install dat@next -g
```

If you receive an `EACCES` error read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

#### Installing from source

Clone this repository and in a terminal inside of the folder you cloned run this command:

```
npm link
```

This should add a `dat` command line command to your PATH. Now you can run the `dat` command to try it out.

## Build Status

Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)

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

It will start downloading the data into the current location. It will also upload that data to others as long as the terminal is open.

Dat uses a built in TCP server to share data. This means at least one of the peers trying to share data will need their dat port open (default port is 3282, DATA on a phone keypad).

For more information, see the [full project documentation here](http://github.com/datproject/docs#readme).
