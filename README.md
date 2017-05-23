# Dat

Dat is the distributed data sharing tool.
Share files with version control, back up data to servers, browse remote files on demand, and automate long-term data preservation.
Secure, distributed, fast.

[<img src="http://datproject.github.io/design/downloads/dat-data-logo.png" align="right" width="140">](https://datproject.org)

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![docs](https://img.shields.io/badge/Dat%20Project-Docs-brightgreen.svg)](http://docs.datproject.org)
[![protocol](https://img.shields.io/badge/Dat-Protocol-lightgrey.svg)](http://www.datprotocol.com)

### Table of Contents

<li><a href="#installation">Installation</a></li>
<li><a href="#getting-started">Getting Started</a></li>
<li><a href="#usage">Using Dat</a></li>
<li><a href="#troubleshooting">Troubleshooting</a></li>
<li><a href="#js-api">JS API</a></li>
<li><a href="#for-developers">For Developers</a></li>

### What is Dat?

[Dat Project](http://datproject.org) is the home to open source data sharing applications led by [Code for Science & Society](http://codeforscience.org), a grant-funded nonprofit.
The Dat Project developed the [Decentralized Archive Transport (Dat) protocol](https://www.datprotocol.com/), which transfers files in a **secure**, **distributed**, and **fast** network allowing you to focus on the fun work without worrying about moving files around.

### Key features

* **Secure** - Data is encrypted upon transfer and the content is verified on arrival, preventing third-party access to metadata and content corruption. [Learn more](http://docs.datproject.org/faq#security-and-privacy).
* **Transparent** - Changes to data are written in an append-only log, creating a version history that improves transparency and auditability.
* **Distributed** - Connect directly to other users or servers sharing or downloading common datasets. Any device can host files to share without the need for centralized servers. [Read more](http://docs.datproject.org/terms#distributed-web).
* **Future-proof** - Unique links are generated using a public key and thus can be used instantly and forever to verify the dataset from anywhere. You don't need to wait for the entire archive to be hashed before you can begin uploading to peers.
* **Fast** -  Files download from multiple sources. Quickly sync updates by only downloading the new bytes, saving time and bandwidth.

## Installation

 Visit our site for an [installation guide](http://datproject.org/install) or pick your favorite client application:

* [Dat Command Line](#command-line-installation) - You are here! Scroll down for the installation details.
* [Dat Desktop](https://datproject.org/install#desktop) - A desktop app to manage multiple Dats on your desktop machine.
* [Beaker Browser](http://beakerbrowser.com) - An experimental p2p browser with built-in support for the Dat protocol.
* [Dat Protocol](https://www.datprotocol.com) - Build your own application on the Decentralized Archive Transport (Dat) protocol.
* [require('dat')](http://github.com/datproject/dat-node) -  Node.js library for building applications on top of Dat.

---

## Dat Command Line

Share, download, and backup files with the command line!
Automatically sync changes to datasets.
Never worry about manually transferring or verifying files again.

Mac/Linux      | Windows      | Version
-------------- | ------------ | ------------
[![Travis](https://travis-ci.org/datproject/dat.svg?branch=master)](https://travis-ci.org/datproject/dat) | [![Build status](https://ci.appveyor.com/api/projects/status/github/datproject/dat?branch=master&svg=true)](https://ci.appveyor.com/project/joehand/dat/branch/master) | [![NPM version](https://img.shields.io/npm/v/dat.svg)](https://npmjs.org/package/dat)

Have questions or need some guidance?
You can chat with us in IRC on [#dat](http://webchat.freenode.net/?channels=dat) or [Gitter](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)!

### Command Line Installation

The Dat command line tool can be installed with `npm`.
Make sure you have `node` version 4 or above and `npm` installed.
You can run `node -v` and `npm -v` to check!

Need to install Node? [Start here](https://nodejs.org/en/download/).

Install `dat` from npm with the `--global, -g` option:

```
npm install -g dat
```

You should be able to run the `dat` command now.
If not, see the [installation troubleshooting](#troubleshooting) for tips.

## Getting started

We have Dat installed, let's use it!
Currently, the Dat command line always moves files from a single source to any number of destinations.
If you are creating files on your computer to share, you will be the source and will use the *share* commands.
Otherwise, you can *clone* files from remote Dat archives shared to you with a Dat link.

You can mostly get around in the Dat command line world with two commands:

#### `dat share <dir>`

Use `dat share` to send files from your computer to any number of other computers or servers.
This will share a local `<dir>` and print a `dat://` link.
Send the printed link to other users so they can download your files.

Dat share will create a `.dat` directory in the folder you share and add a `secret_key` to `~/.dat/secrey_keys` (the secret key allows you to write updates to a dat).
The `.dat` folder allows you to add new files and update old files on the same Dat link.

![share](https://cloud.githubusercontent.com/assets/684965/22603762/91003186-e9fd-11e6-9138-f5c5045e7273.gif)

#### `dat clone dat://<link> <download-dir>`

Use `dat clone` to download files from a remote computers sharing files with Dat.
This will download the files from `dat://<link>` to your `<download-dir>`.
The download exits after it completes but you can continue to update the files later after the clone is done.

![clone](https://cloud.githubusercontent.com/assets/684965/22602275/67f67be8-e9f7-11e6-889d-40895e50d263.gif)

#### A Brief Primer on `dat://` links

You may have seen Dat links around: `dat://ff34725120b2f3c5bd5028e4f61d14a45a22af48a7b12126d5d588becde88a93`. What is with the weird long string of characters? Let's break it down!

##### `dat://` - the protocol

The first part of the link is the link protocol, Dat (read about the Dat protocol at [datprotocol.com](https://www.datprotocol.com)).
The protocol describes what "language" the link is in and what type of applications can open it.

##### `ff34725120b2f3c5bd5028e4f61d14a45a22af48a7b12126d5d588becde88a93` - the unique identifier

The second part of the link is a 64-character hex strings ([ed25519 public-keys](https://ed25519.cr.yp.to/) to be precise).
Each Dat archive gets a public key link to identify it.
With the hex string as a link we can do two things: 1) encrypt the data transfer and 2) give each archive a persistent identifier, an ID that never changes, even as file are updated (as opposed to a checksum which is based on the file contents).

##### `dat://ff34725120b2f3c5bd5028e4f61d14a45a22af48a7b12126d5d588becde88a93`

All together, the links can be thought of similarly to a web URL, as a place to get content, but with some extra special properties.
Links point to a set of files instead of a specific server.
This means when you run `dat clone dat://<link>` you do not have to worry about who is hosting the files at that link or if the content has changed.
You'll always get the latest content in the network and the link helps to verify the integrity of the content!

Try out `dat clone` with the link above to read more about the protocol!

### Demo File Download

To get started using Dat, we can download files via Dat.
Similar to git, you do this by running `dat clone`:

```
dat clone dat://bec32c0c3d2458c4497fd4c2238ec0926f95bc18521bd60d6532ed8ea3f85822 download-folder
Cloning: 96 files (4.8 GB)

1 connection | Download 3.0 MB/s Upload 0 B/s

Downloading updates...
[==========--------------------------------] 5.36%
```

This will download the files shared at that link to a folder named `download-folder`.
These files are being shared by a server over Dat (to ensure high availability) but you may connect to any number of peers also hosting the content.

Get started using Dat today with the `share` and `clone` commands or read below for more details.

## Usage

Dat archives have a one to many relationship.
There is a single source that can create and write files.
There are many peers that can download the files *(in future versions there may be several sources)*.

* **Sharing**: If you want to share files from your computer that you will update, you are the *source*.
* **Downloading**: If your colleague has files they want to share, they will be the source and you'll be downloading from a *remote* archive.

The first time you run a command, a `.dat` folder to store the Dat metadata.
Once a Dat is created, you can run all the commands inside that folder, similar to git.

### Sharing

The quickest way to get started sharing files is to `share`:

```
❯ dat share
dat://3e830227b4b2be197679ff1b573cc85e689f202c0884eb8bdb0e1fcecbd93119
Sharing dat: 24 files (383 MB)

0 connections | Download 0 B/s Upload 0 B/s

Importing 528 files to Archive (165 MB/s)
[=-----------------------------------------] 3%
ADD: data/expn_cd.csv (403 MB / 920 MB)
```

You can also do `create` and `sync` in separate steps if you'd like more control over the importing.

#### Creating a Dat archive

`dat create` will give you a few prompts to add some information to your dat.
Dats can have `dat.json` files, which provide *basic* metadata used in Dat applications.
You can choose to import files during create, or wait until later.

```
dat create [<folder>]
```

#### Syncing to Network

```
dat sync [<folder>] [--no-import] [--no-watch]
```

Start sharing your Dat Archive over the network.
Sync will import new or updated files since you ran `create` or `sync` last.
Sync watched files for changes and imports updated files.

* Use `--no-import` to not import any new or updated files.
* Use `--no-watch` to not watch directory for changes. `--import` must be true for `--watch` to work.

#### Ignoring Files

By default, dat will ignore any files in a `.datignore` file, similar to git. Dat also ignores all hidden folders and files.

Dat uses [dat-ignore](https://github.com/joehand/dat-ignore) to decide if a file should be ignored.

### Downloading

Start downloading by running the `clone` command.
This will create a folder, download the content and metadata, and create a `.dat` folder.
Once you start a download, you can resume using `clone` or the other download commands.

```
dat clone <dat-link> [<folder>] [--temp]
```

Clone a remote Dat Archive to a local folder.
This will create a folder with the key name is no folder is specified.

#### Updating Downloaded Archives

Once a Dat is clone, you can run either `dat pull` or `dat sync` in the folder to update the archive.

```
dat pull [<folder>]
```

Update a cloned Dat Archive to latest files and exit.

```
dat sync [<folder>]
```

Download latest files and keep connection open to continue updating as remote source is updated.

### Shortcut commands

* `dat <link> {dir}` will run `dat clone` for new dats or resume the exiting dat in `dir`
* `dat {dir}` is the same as running `dat sync {dir}`

### Dat Registry and Authentication

As part of our [Knight Foundation grant](https://datproject.org/blog/2016-02-01-announcing-publicbits), we are building a registry for Dat archives.
We will be running a Dat registry at datproject.org, but anyone will be able to create their own.
Once registered, you will be able to publish Dat archives from our registry.
Anyone can clone archives published to a registry without registration:

```
dat clone datproject.org/karissa/more-tweets-more-votes
```

#### Auth (experimental)

Other auth commands are still in an experimental status.
New registrations on the Dat archive registry are currently limited.

```
dat register
dat login
dat logout
dat whoami
```

Once you are logged in to a server. You can publish a Dat archive:

```
cd my-data
dat create
dat publish
```

All authentication requests take the `--server` option.
You can deploy your own compatible [registry server](https://github.com/datproject/datproject.org) if you'd rather use your own service.

## Troubleshooting

We've provided some troubleshooting tips based on issues users have seen.
Please [open an issue](https://github.com/datproject/dat/issues/new) or ask us in our [chat room](https://gitter.im/datproject/discussions) if you need help troubleshooting and it is not covered here.

If you have trouble sharing/downloading in a directory with a `.dat` folder, try deleting it and running the command again.

#### Check Your Dat Version

Knowing the version is really helpful if you run into any bugs, and will help us troubleshoot your issue.

Check your Dat version:

```
dat -v
```

You should see the Dat semantic version printed, e.g. 13.1.2.

### Installation Issues

#### Node & npm

To use the Dat command line tool you will need to have [node and npm installed](https://docs.npmjs.com/getting-started/installing-node).
Make sure those are installed correctly before installing Dat.
You can check the version of each:

```
node -v
npm -v
```

#### Global Install

The `-g` option installs Dat globally allowing you to run it as a command.
Make sure you installed with that option.

* If you receive an `EACCES` error, read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions) on fixing npm permissions.
* If you receive an `EACCES` error, you may also install dat with sudo: `sudo npm install -g dat`.
* Have other installation issues? Let us know, you can [open an issue](https://github.com/datproject/dat/issues/new) or ask us in our [chat room](https://gitter.im/datproject/discussions).

### Debugging Output

If you are having trouble with a specific command, run with the debug environment variable set to `dat` (and optionally also `dat-node`). =
This will help us debug any issues:

```
DEBUG=dat,dat-node dat clone dat://<link> dir
```

### Networking Issues

Networking capabilities vary widely with each computer, network, and configuration.
Whenever you run a Dat there are several steps to share or download files with peers:

1. Discovering Peers
2. Connecting to Peers
3. Sending & Receiving Data

With successful use, Dat will show `Connected to 1 peer` after connection.
If you never see a peer connected your network may be restricting discovery or connection.
Please try using the `dat --doctor` command (see below) between the two computers not connecting. This will help troubleshoot the networks.

* Dat may [have issues](https://github.com/datproject/dat/issues/503) connecting if you are using iptables.

#### Dat Doctor

We've included a tool to identify network issues with Dat, the Dat doctor.
The Dat doctor will run two tests:

1. Attempt to connect to a server running a Dat peer.
2. Attempt a direct connection between two peers. You will need to run the command on both the computers you are trying to share data between.

Start the doctor by running:

```
dat doctor
```

For direct connection tests, the doctor will print out a command to run on the other computer, `dat doctor <64-character-string>`.
The doctor will run through the key steps in the process of sharing data between computers to help identify the issue.

---

## JS API

You can use Dat in your javascript application:

```js
var Dat = require('dat')

Dat('/data', function (err, dat) {
  // use dat
})
```

**[Read more](https://github.com/datproject/dat-node) about the JS usage provided via `dat-node`.**

## For Developers

Please see [guidelines on contributing](https://github.com/datproject/dat/blob/master/CONTRIBUTING.md) before submitting an issue or PR.

This command line library uses [dat-node](https://github.com/datproject/dat-node) to create and manage the archives and networking.
If you'd like to build your own Dat application that is compatible with this command line tool, we suggest using dat-node.

### Installing from source

Clone this repository and in a terminal inside of the folder you cloned run this command:

```
npm link
```

This should add a `dat` command line command to your PATH.
Now you can run the dat command to try it out.

The contribution guide also has more tips on our [development workflow](https://github.com/datproject/dat/blob/master/CONTRIBUTING.md#development-workflow).

* `npm run test` to run tests
* `npm run auth-server` to run a local auth server for testing

## License

BSD-3-Clause
