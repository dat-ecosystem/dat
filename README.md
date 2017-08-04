# Dat

> npm install -g dat

Dat is the distributed data sharing tool.
Share files with version control, back up data to servers, browse remote files on demand, and automate long-term data preservation.
Secure, distributed, fast.

[<img src="https://datproject.github.io/design/downloads/dat-data-logo.png" align="right" width="140">](https://datproject.org)

Have questions? Join our chat via IRC or Gitter:

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### Table of Contents

<li><a href="#installation">Installation</a></li>
<li><a href="#getting-started">Getting Started</a></li>
<li><a href="#usage">Using Dat</a></li>
<li><a href="#troubleshooting">Troubleshooting</a></li>
<li><a href="#js-api">Javascript API</a></li>
<li><a href="#for-developers">For Developers</a></li>

#### What is Dat?

Share, backup, and publish your filesystem. You can turn any folder on your computer into a dat. Dat scans your folder, allowing you to:

* Track your files with automatic version history.
* Share files with others over a secure peer to peer network.
* Automate live backups to external hds or remote servers.
* Publish and share files with built in HTTP server.

Dat allows you to focus on the fun work without worrying about moving files around. **Secure**, **distributed**, **fast**.

The [Dat Project](http://datproject.org) is the home to open source data sharing applications led by [Code for Science & Society](http://codeforscience.org), a nonprofit.

* Documentation: [docs.datproject.org](http://docs.datproject.org)
* Dat Protocol: [datprotocol.com](http://www.datprotocol.com)
* [Dat white paper](https://github.com/datproject/docs/blob/master/papers/dat-paper.pdf)

##### Other Applications

Rather not use the command line? Check out these options:

* [Dat Desktop](https://datproject.org/install#desktop) - A desktop app to manage multiple Dats on your desktop machine.
* [Beaker Browser](http://beakerbrowser.com) - An experimental p2p browser with built-in support for the Dat protocol.

## dat command line

Share, download, and backup files with the command line! Automatically sync changes to datasets. Never worry about manually transferring files again.

Mac/Linux      | Windows      | Version
-------------- | ------------ | ------------
[![Travis](https://travis-ci.org/datproject/dat.svg?branch=master)](https://travis-ci.org/datproject/dat) | [![Build status](https://ci.appveyor.com/api/projects/status/github/datproject/dat?branch=master&svg=true)](https://ci.appveyor.com/project/joehand/dat/branch/master) | [![NPM version](https://img.shields.io/npm/v/dat.svg)](https://npmjs.org/package/dat)

Have questions or need some guidance?
You can chat with us in IRC on [#dat](http://webchat.freenode.net/?channels=dat) or [Gitter](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)!

## Installation

Dat can be used as a command line tool or as javascript library:

* `npm install -g dat` - Install `dat` globally to use in the command line.
* [require('dat')](http://github.com/datproject/dat-node) - dat-node, a library for downloading and sharing Dat archives in javascript apps.

### Installing via npm

The Dat command line tool can be installed with `npm`:

```
npm install -g dat
```

Make sure you have `node` and `npm` installed first. If not, see the prerequisites section below.

Once `npm install` finishes, you should be able to run the `dat` command. If not, see the [installation troubleshooting](#troubleshooting) for tips.

#### Prerequisites

* **Node**: You'll need to [install Node](https://nodejs.org/en/download/) before installing Dat. Dat needs `node` version 4 or above and `npm` installed. You can run `node -v` to check your version.
* **npm**: `npm` is installed with node. You can run `npm -v` to make sure it is installed.

Once you have `npm` ready, install `dat` from npm with the `--global, -g` option, `npm install -g dat`.

### JS Library

Add Dat to your `package.json`, `npm install dat --save`. Dat exports the [dat-node](http://github.com/datproject/dat-node) API via `require('dat')`. Use it in your javascript applications! Dat Desktop and dat command line both use dat-node to share and download dats.

Full API documentation is available in the dat-node repository on Github.

## Getting started

We have Dat installed, let's use it!

Dat's unique design works wherever you store your data. You can create a new dat from any folder on your computer.

A dat is some files from your computer and a `.dat` folder. Each dat has unique `dat://` link. With your dat link, other users can download your files and live sync any updates.

### Sharing Data

You can start sharing your files with a single command. Unlike `git`, you do not have to initialize a repository first, `dat share` will do that for you:

```
dat share <dir>
```

Use `dat share` to create a dat and sync your files from your computer to other users. Dat scans your files inside `<dir>`, creating metadata in `<dir>/.dat`. Dat stores the public link, version history, and file information inside the dat folder.

![share](https://raw.githubusercontent.com/datproject/docs/master/assets/cli-share.gif)

### Downloading Data

```
dat clone dat://<link> <download-dir>
```

Use `dat clone` to download files from a remote computers sharing files with Dat. This will download the files from `dat://<link>` to your `<download-dir>`. The download exits after it completes but you can continue to update the files later after the clone is done. Use `dat pull` to update new files or `dat sync` to live sync changes.

![clone](https://raw.githubusercontent.com/datproject/docs/master/assets/cli-clone.gif)

Try out `dat clone` with the link above to read more about the protocol!

### Other Cool Commands

A few other highlights. Run `dat help` to see the full usage guide.

* `dat create` - Create a empty dat and dat.json file.
* `dat doctor` - Dat network doctor! The doctor tries to connect to a public peer. The doctor also creates a key to test direct connections.
* `dat log ~/data/dat-folder/` or `dat log dat://<key>` - view the history and metadata information for a dat.

### Quick Demos

To get started using Dat, you can try downloading a dat and then sharing a dat of your own.

#### Download Demo

We made a demo folder we made just for this exercise. Inside the demo folder is a `dat.json` file and a gif. We shared these files via Dat and now you can download them with our dat key!

Similar to git, you do download somebody's dat by running `dat clone <link>`. You can also specify the directory:

```
❯ dat clone dat://778f8d955175c92e4ced5e4f5563f69bfec0c86cc6f670352c457943666fe639 ~/Downloads/dat-demo
dat v13.5.0
Created new dat in /Users/joe/Downloads/dat-demo/.dat
Cloning: 2 files (1.4 MB)

2 connections | Download 614 KB/s Upload 0 B/s

dat sync complete.
Version 4
```

This will download our demo files to the `~/downloads/dat-demo` folder. These files are being shared by a server over Dat (to ensure high availability) but you may connect to any number of users also hosting the content.

You can also also view the files online: [datproject.org/778f8d955175c92e4ced5e4f5563f69bfec0c86cc6f670352c457943666fe639](https://datproject.org/778f8d955175c92e4ced5e4f5563f69bfec0c86cc6f670352c457943666fe639/). datproject.org can download files over Dat and display them on http as long as someone is hosting it. The website temporarily caches data for any visited links (do not view your dat on datproject.org if you do not want us caching your data).

#### Sharing Demo

Dat can share files from your computer to anywhere. If you have a friend going through this demo with you, try sharing to them! If not we'll see what we can do.

Find a folder on your computer to share. Inside the folder can be anything, Dat can handle all sorts of files (Dat works with really big folders too!).

First, you can create a new dat inside that folder. Using the `dat create` command also walks us through making a `dat.json` file:

```
❯ dat create
Welcome to dat program!
You can turn any folder on your computer into a Dat.
A Dat is a folder with some magic.
```

This will create a new (empty) dat. Dat will print a link, share this link to give others access to view your files.

Once we have our dat, run `dat share` to scan your files and sync them to the network. Share the link with your friend to instantly start downloading files.

You can also try viewing your files online. Go to [datproject.org](https://datproject.org/explore) and enter your link to preview on the top right. *(Some users, including me when writing this, may have trouble connecting to datproject.org initially. Don't be alarmed! It is something we are working on. Thanks.)*

#### Bonus HTTP Demo

Dat makes it really easy to live files on a http server. This is a cool demo because we can also see how version history works! Serve dat files on http with the `--http` option. For example, `dat sync --http`, serves your files to a http website with live reloading and version history! This even works dats your are downloading (add the `--sparse` option to only download files you select via http). The default http port is 8080.

*Hint: Use `localhost:8080/?version=10` to view a specific version.*

Get started using Dat today with the `share` and `clone` commands or read below for more details.

## Usage

The first time you run a command, a `.dat` folder to store the Dat metadata.
Once a Dat is created, you can run all the commands inside that folder, similar to git.

Dat keep secret keys in the `~/.dat/secret_keys` folder. These are required to write to any dats you create.

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


#### Creating a dat & dat.json

```
dat create [<folder>]
```

The create command prompts you to make a dat.json file and creates a new dat. Import the files with sync or share.


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

By default, dat will ignore any files in a `.datignore` file, similar to git. Each file should separated by a newline. Dat also ignores all hidden folders and files.

Dat uses [dat-ignore](https://github.com/joehand/dat-ignore) to decide if a file should be ignored.

#### Selecting Files

By default, dat will download all files. If you want to only download a subset, you can create a `.datdownload` file which downloads only the files and folders specified. Each should be separated by a newline.


### Downloading

Start downloading by running the `clone` command. This creates a folder, download the content and metadata, and a `.dat` folder inside. Once you started the download, you can resume using `clone` or the other download commands.

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
dat clone datproject.org/jhand/cli-demo
```

#### Auth (experimental)

You can also use the `dat` command line to register and publish to Dat registries. Dat plans to support any registry. Currently, `datproject.org` is the only available and the default.

To register and login you can use the following commands:

```
dat register [<registry>]
dat login
dat whoami
```

Once you are logged in to a registry. You can publish a Dat archive:

```
cd my-data
dat create
dat publish --name my-dataset
```

All registry requests take the `<registry>` option if you'd like to publish to a different registry than datproject.org.
You can deploy your own compatible [registry server](https://github.com/datproject/datproject.org) if you'd rather use your own service.

### Key Management & Moving Dats

`dat keys` provides a few commands to help you move or backup your dats.

Writing to a dat requires the secret key, stored in the `~/.dat` folder. You can export and import these keys between dats. First, clone your dat to the new location:

* (original) `dat share`
* (duplicate) `dat clone <key>`

Then transfer the secret key:

* (original) `dat keys export` - copy the secret key printed out.
* (duplicate) `dat keys import` - this will prompt you for the secret key, paste it in here.

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
