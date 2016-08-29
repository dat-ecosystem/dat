# Dat

Dat is a decentralized data tool for distributing data small and large.

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![docs](https://img.shields.io/badge/Dat%20Project-Docs-green.svg)](http://docs.dat-data.com)

### Key features:

  * **Live sync** folders by sharing files as they are added or changed.
  * **Distribute large files** without copying data to a central server by connecting directly to peers.
  * **Intelligently sync** by deduplicating data between versions.
  * **Verify data integrity** using strong cryptographic hashes.
  * **Work everywhere**, including on the [command line](https://github.com/datproject/dat), in the [browser](https://github.com/datproject/dat.land), and on the [desktop](https://github.com/juliangruber/dat-desktop).

### [Documentation](http://docs.dat-data.com) | [Video Demo](https://www.youtube.com/watch?v=fxKjSyCoqO4) | [Ecosystem](https://github.com/clkao/awesome-dat)

---

## Dat Command Line Tool

This guide will help you get started with the Dat command line tool. We are also developing [web](https://github.com/datproject/dat.land) and [desktop](https://github.com/juliangruber/dat-desktop) applications for Dat.

### Table of Contents

<li><a href="#getting-started">Getting Started</a></li>
<li><a href="#using-dat">Using Dat</a></li>
<li><a href="#troubleshooting">Troubleshooting</a></li>
<li><a href="#for-developers">For Developers</a></li>

## Getting Started

The Dat command line tool can be used to share, download, and sync files across many computers via the command line.

Windows        | Mac/Linux    | Version
-------------- | ------------ | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/github/datproject/dat?branch=master&svg=true)](https://ci.appveyor.com/project/datproject/dat) | [![Travis](https://api.travis-ci.org/datproject/dat.svg)](https://travis-ci.org/datproject/dat) | [![NPM version](https://img.shields.io/npm/v/dat.svg?style=flat-square)](https://npmjs.org/package/dat)

### Installation

```
npm install -g dat
```

You should be able to run the `dat` command now. If not, see the [installation troubleshooting](#troubleshooting) for tips.

### Demo

We have Dat installed, now let's use it! In this quick demo we will download our documentation files using Dat.

You tell Dat what files to download by giving it a Dat link. Dat links are 64 character strings, for example `395e3467bb5b2fa083ee8a4a17a706c5574b740b5e1be6efd65754d4ab7328c2`.

Along with the link, you tell Dat where to download the files. All together, you can download files by typing `dat <dat-link> <download-directory>`.

We have our Dat documentation folders being shared by Dat (at the key above). For this example, we can download those files to your computer. In your console, run:

```
dat 395e3467bb5b2fa083ee8a4a17a706c5574b740b5e1be6efd65754d4ab7328c2 dat_docs
```

You should see the output below. Once the download is finished, the files will be available on your computer in the `dat_docs` folder!

![Download gif](https://raw.githubusercontent.com/datproject/docs/master/assets/cli_download.gif)

### CLI Development Status

This is the Dat CLI 1.0 release candidate (RC2). We are actively seeking feedback & developing this release candidate. Follow [this issue](https://github.com/datproject/projects/issues/5) for the Dat CLI road map discussion and see [known RC2 issues](https://github.com/datproject/dat/issues/486).

**Please note** that previous versions of Dat (alpha, beta) are incompatible with the 1.0 release candidate.

## Using Dat

There are two commands in Dat:

1. Share data: `dat <directory>` will share a directory on your computer.
2. Download data: `dat <dat-link> <download-directory>` will download files from the Dat link to a directory on your computer. 

Running `dat` in the console, with no arguments, will show you the usage guide. You can always use this as a reference for all the commands:

```
dat <directory>

  share directory and create a dat-link

  --snapshot            create a snapshot of directory
  --port, -p            set a specific inbound tcp port

dat <dat-link> <directory>

  download a dat-link into directory

  --exit                exit process after download finishes
  --port, -p            set a specific inbound tcp port

general options

  --version, -v         get installed dat version
  --doctor              run dat doctor
  --quiet, -q           output only dat-link, no progress information
  --debug               show debugging output
```

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

You are now publishing that data from your computer. It will be publicly accessible as long as your terminal is open and the process is still running. The hash is a **secret hash**, your data is visible to anyone you send the hash to.

#### Updating Shared Files

Dat makes it easy to share a folder and send files as they are added to the folder. By default, when you share using `dat my_data/` you will be in live sync mode. Anyone connected to you will receive new files.

#### Creating a snapshot

A snapshot reads the files and creates a unique link that will always be the same for that set of files (if they remain unchanged). To create a snapshot use the snapshot option: `dat my_data/ --snapshot`. Snapshots are automatically created for you in live mode as files update.

#### Sharing Options

`dat <directory> --snapshot`

Share a snapshot of the current files. 

`dat <directory> --port=1234`

Set your inbound TCP port. This is useful for debugging or on restrictive networks. 

### Downloading Files

Download files from a Dat link by typing: `dat <dat-link> <download-directory>`:

```
$ dat d6e1875598fae25165eff440ffd01513197ad0db9dbb9898f2a141288b9322c6 download_dir
Downloading in /Users/joe/download_dir

Share Link: d6e1875598fae25165eff440ffd01513197ad0db9dbb9898f2a141288b9322c6
The Share Link is secret and only those you share it with will be able to get the files

[==============>] Downloaded 3 files (1.44 kB/1.44 kB)

Connected to 1 peers. Downloading 1.44 kB/s. Watching for updates...
```

Dat will start downloading the data into the `download_dir` folder. Once the download is finished (a message will print and the bar will turn green), you can safely exit the process with `Ctrl-C` (`Cmd-C` on Mac). 

While downloading, you may be connected to more than 1 peer. Anyone who has the Dat link will be able to download and re-host a copy of the data. So you may be downloading from (and sharing to) other people that are also downloading that data! You only need one block of data to start helping as a host. It's distributed mad science!

#### Updating the Downloaded Files

What happens if the files get updated? IfDat auto-syncs new files if it is still running. If you exited the process, you can run the same command you ran before (with the same link and directory) and the files will update!

#### Download Options

`dat <dat-link> <directory> --exit` 

After files are done downloading, exit the process. If you are connected to a live Dat you will not get new files unless you run the command again.

`dat <dat-link> <directory> --port=1234`

Set your inbound TCP port. This is useful for debugging or on restrictive networks. 

### Live Sync & Snapshots

Dat makes it easy to share a folder and send files as they are changed or added. By default, when you share using Dat you will be in *live sync* mode. Anyone connected to you will receive file changes as you make them.

When downloading a Dat, you do not have to worry about live mode. It will automatically start in the right mode based on the link. 

To create a snapshot when sharing files use the snapshot option: `dat my_data/ --snapshot`. A snapshot reads the files and creates a specific link that will never change (as long as the files don't change).

### Dat Metadata Storage

When you run a command, Dat creates a hidden folder, `.dat`, in the directory specified. Similar to git, this folder stores information about your Dat. File metadata and the Dat link are stored to make it easy to continue sharing or downloading the same directory.

## Troubleshooting

We've provided some troubleshooting tips based on issues users have seen. Please [open an issue](https://github.com/datproject/dat/issues/new) or ask us in our [chat room](https://gitter.im/datproject/discussions) if you need help troubleshooting and it is not covered here.

If you have trouble sharing/downloading in a directory with a `.dat` folder, try deleting it and running the command again.

#### Check Your Dat Version

Knowing the version is really helpful if you run into any bugs, and will help us troubleshoot your issue.

Check your Dat version:

```
dat -v
```

You should see the Dat semantic version printed, e.g. 11.1.2.

### Installation Issues

#### Node & npm

To use the Dat command line tool you will need to have [node and npm installed](https://docs.npmjs.com/getting-started/installing-node). Make sure those are installed correctly before installing Dat. You can check the version of each:

```
node -v
npm -v
```

#### Global Install

The `-g` option installs Dat globally allowing you to run it as a command. Make sure you installed with that option.

* If you receive an `EACCES` error, read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions) on fixing npm permissions.
* If you receive an `EACCES` error, you may also install dat with sudo: `sudo npm install -g dat`.
* Have other installation issues? Let us know, you can [open an issue](https://github.com/datproject/dat/issues/new) or ask us in our [chat room](https://gitter.im/datproject/discussions).

### Networking Issues

Networking capabilities vary widely with each computer, network, and configuration. Whenever you run a Dat there are several steps to share or download files with peers:

1. Discovering Peers
2. Connecting to Peers
3. Sending & Receiving Data

With successful use, Dat will show `Connected to 1 peer` after connection. If you never see a peer connected your network may be restricting discovery or connection. Please try using the `dat --doctor` command (see below) between the two computers not connecting. This will help troubleshoot the networks.

* Dat may [have issues](https://github.com/datproject/dat/issues/503) connecting if you are using iptables.

#### Dat Doctor

We've included a tool to identify network issues with Dat, the Dat doctor. You will need to run the command on both the computers you are trying to share data between. On the first computer, run:

```
dat --doctor
```

The doctor will print out a command to run on the other computer, `dat --doctor=<64-character-string>`. The doctor will run through the key steps in the process of sharing data between computers to help identify the issue.

---

## For Developers

Please see [guidelines on contributing](https://github.com/datproject/dat/blob/master/CONTRIBUTING.md) before submitting an issue or PR.

### Installing from source

Clone this repository and in a terminal inside of the folder you cloned run this command:

```
npm link
```

This should add a `dat` command line command to your PATH. Now you can run the `dat` command to try it out.

The contribution guide also has more tips on our [development workflow](https://github.com/datproject/dat/blob/master/CONTRIBUTING.md#development-workflow).


### Internal API

**Note: we are in the process of moving the js library to a separate module, [joehand/dat-js](https://github.com/joehand/dat-js).**

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

## License

BSD-3-Clause