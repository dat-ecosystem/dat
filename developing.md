# Hacking on dat

`dat` is primarily intended as a command line tool. You can install `dat` using `git` and `npm` (`npm` usually gets installed when you install `node`)

There is also a programmatic JavaScript API that you can use in node.js programs for more advanced use cases.

## Install

to get the current stable version:

```
npm install dat -g
```

or to install the latest version from `git`:

```
git clone git://github.com/maxogden/dat.git
cd dat
npm install
npm link
```

## Basic commands

There are subject to change. See `lib/commands.js` for the source code

### dat init

turns the current folder into a new empty dat store

### dat init --remote http://localhost:6461/_archive

initializes a new dat store by copying a remote dat server

### dat pull

pulls new changes/data from a remote dat server

### dat serve

starts an http + tcp server on port `6461` that serves the data in the current dat store

### dat compact

removes duplicate copies of documents

### dat dump

dumps out the entire dat store to stdout as JSON

### dat crud

used for debugging. usage: `dat crud <action> <key> <value>` e.g. `dat crud get foo` or `dat crud put foo bar`
