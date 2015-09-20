# Dat: version, fork, and sync data

Welcome to Dat!

Key features:

  * **manage and track change history** in binary and tabular data
  * **supply access points to data** across the network with a peer-to-peer model
  * **create historical checkpoints** with metadata (e.g., message, timestamp, author)
  * **sync incrementally** between machines
  * **encourage forking** of data, rather than forcing merges

If you haven't yet, please swing over to our [interactive tutorial to try dat now in your browser](http://try-dat.com).

**Have questions?** Join `#dat` on [freenode](https://webchat.freenode.net) or [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge). Chat logs are [available here](https://botbot.me/freenode/dat/)

[![NPM](https://nodei.co/npm/dat.png?global=true)](https://nodei.co/npm/dat/)

Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)

## Overview

Dat is a data versioning, forking, and syncing tool.  Dat embraces the Unix philosophy: a modular design with composable parts. All of the pieces (storage, replication transports, compression, Merkle DAG) can be replaced with alternatives as long as they implement the abstract API.

## Installation

##### Step 1: Install Node.js from the [Node website](http://nodejs.org/). (Installing Node via Homebrew can cause problems, and is not recommended.)

We Recommend Node version 0.12 or above. You can check your version of Node by running `node -v` on the command line.

```
$ node -v
v0.12...
```

##### Step 2: Install dat

```
npm install dat -g
```

The `-g` means "install globally" which makes the `dat` command available in your command line path.

If it all worked correctly, you should see something like this when you type `dat`:

```
usage: dat <command(s)> [--flag] [--key=value]

commands:
  init        Initialize a new dat store in a directory.
  status      Show current status.
  log         View a list of recent changes
  clone       Download and make a full copy of a remote dat.
  ...
```

## Using dat

You can think of dat as a streaming interface for data on the filesystem.

Create a new directory (e.g., `mkdir dat-test`) and open that directory (e.g., `cd dat-test`). Make this directory into a dat repository by running `dat init`. Now you can import a CSV or newline-delimited JSON file to the dat repository (for example, [an exoplanet orbit CSV file](http://exoplanets.org/csv-files/exoplanets.csv)) by running `dat import http://exoplanets.org/csv-files/exoplanets.csv -d exoplanets`.

Once imported, the data can be forked, diffed, merged, replicated, destroyed, etc.—[see a list of all dat commands](https://github.com/maxogden/dat/blob/master/docs/cli-docs.md) for more.

Run the tutorial at http://try-dat.com for a quick start to the basic collaborative command-line use cases.

## Why not git?

Wouldn't it be great if you could add all of your code, dependencies, and data into a version control system? That's not good practice with git, because git is inefficient for large data.

Dat is written with streaming components, unlike git. Dat is written in Node.js (with some C bindings), which is good for piping data around the web and the filesystem.

Have you ever done `git pull` and gotten a merge conflict? Or has git prevented you from executing `git push`? Dat will never do that. Dat doesn't force merges when you pull data from a peer. Dat is designed with data in mind, unlike git, which was designed for source code.

## Troubleshooting

#### "Error: Module did not self-register"

Try reinstalling dat. This is caused by a leveldown-prebuilt leftover from a previous version of dat. See [#370](https://github.com/maxogden/dat/issues/370).

```
npm uninstall dat -g
npm install dat -g
```

#### I'm getting a problem with 'leveldown' when trying to install.

Try adding `--unsafe-perm` to the installation command. See [#374](https://github.com/maxogden/dat/issues/374).

```
npm install dat -g --unsafe-perm
```

Dat is still in beta. If you have any trouble, let us know!  Please tell us by [opening an issue here](http://github.com/maxogden/dat/issues/new) or asking us a question in irc or gitter.

## About dat

The `dat` module is designed with a small-core philosophy. It defines an API for reading, writing, and syncing datasets, and is implemented using Node.js.

Internally, dat has two kinds of data storage: tabular and blob. The default tabular data store is [LevelDB](http://leveldb.org) and the default blob store stores files on a [content-addressable blob store](https://github.com/mafintosh/content-addressable-blob-store). Both of these default backends can be swapped out for other backends.

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

* Follow [@dat_project](https://twitter.com/dat_project) on Twitter
* Have any other questions/concerns? [Open an issue](https://github.com/maxogden/dat/issues)
* Suggest an organization that should be using `dat` to manage their data—we will help!
* Join `#dat` on [freenode](https://webchat.freenode.net) or [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge).
