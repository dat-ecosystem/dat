# dat

Version, sync, and publish data.

Key features:

  * **manage and track change history** in binary and tabular data
  * **supply access points to data** across the network with a peer-to-peer model
  * **create historical checkpoints** with metadata (e.g., message, timestamp, author)
  * **sync incrementally** between machines
  * **encourage forking** of data, rather than forcing merges

**Have questions?** Join `#dat` on [freenode](https://webchat.freenode.net) or [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge). Chat logs are [available here](https://botbot.me/freenode/dat/)

[![NPM](https://nodei.co/npm/dat.png?global=true)](https://nodei.co/npm/dat/)

Windows        | Mac/Linux
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)


## Install

```npm install -g dat```


## Example

Go into a directory and type

```
$ cd mydata/
$ dat publish
bd3423sdf2342ksdjf238422k3
```

You are now publishing that data from your computer and it will be publicly accessible. Your friend can get that data like this:

```
$ dat bd3423sdf2342ksdjf238422k3 </path/to/location>
```

It will start downloading the data into /path/to/location.

## In theory, one day:

```
$ dat login
Username: karissa
Password: ********
$ dat publish genome
karissa/genome
```

```
dat karissa/genome/path/to/file/i/want.txt
```

## Overview

Dat is a data versioning, forking, and syncing tool.  Dat embraces the Unix philosophy: a modular design with composable parts. All of the pieces (storage, replication transports, compression, Merkle DAG) can be replaced with alternatives as long as they implement the abstract API.
