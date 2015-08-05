# dat command line API

This is the `dat` command line API as of the Beta release.

- [repository commands](#repository-commands)
  - [dat](#dat)
  - [dat init](#dat-init)
  - [dat status](#dat-status)
  - [dat log](#dat-log)
  - [dat clone](#dat-clone)
  - [dat push](#dat-push)
  - [dat pull](#dat-pull)
  - [dat checkout](#dat-checkout)
  - [dat datasets](#dat-datasets)
  - [dat diff](#dat-diff)
  - [dat merge](#dat-merge)
  - [dat forks](#dat-forks)
  - [dat keys](#dat-keys)
  - [dat files](#dat-files)
  - [dat replicate](#dat-replicate)
  - [dat serve](#dat-serve)
  - [dat destroy](#dat-destroy)
- [dataset commands](#dataset-commands)
  - [dat import](#dat-import)
  - [dat export](#dat-export)
  - [dat read](#dat-read)
  - [dat write](#dat-write)

## repository commands

### dat

Lists available commands and shows instructions

```bash
dat
```

### Options

Options usually have shorthand `-` and long form `--` variations:

```
dat -p /test
dat --path /test
```

Some options are boolean (no value), others use the next positional argument as their value.

```
# v/version is boolean, the `init` is not affected by the preceding flag
dat -v init
dat --version

# path is not boolean, meaning `init` would be incorrectly parsed here
dat -p init
```

### Global Options

All commands have these options:

- `path`/`p` - specify the path to the dat directory that the command should use. Default is current working directory
- `help`/`h` (boolean) - pass this option to show the help for a command.
- `json` - set this to true to change all output to JSON for easy parsing.
- `checkout` - the version hash to use when retrieving data for a command.
- `verbose` - show the full stack trace/debug info on errors

Example output:

```
$ dat
usage: dat <command(s)> [-flag] [--key=value]

commands:
  init      initialize a new dat in a directory
  checkout  dat will operate at a particular fork
  add       import a file into dat
  push      push data to a remote dat
  ... etc

type `dat <command> --help` to view detailed help
```

### dat init

Init a new dat.

```bash
dat init
```

Example output:

```
$ cd /test
$ dat init
Initialized a new dat at /path/to/test
```

### dat status

Show current status, including row count, file count, last updated

```bash
dat status
```

Example output:

```
$ dat status
Current version is now 8eaf3b0739d32849687a544efae8487b5b05df52 (latest)
2 datasets, 438 keys, 32 files, 3 versions, 143 Mb total
Last updated 3 seconds ago (Tue Jun 02 2015 13:46:54 GMT-0700 (PDT))
```

### dat log

Stream versions out in historical order as json

```bash
dat log [<version>]
```

By default (no arguments) it will print out json representing each change to the repository.

If `<version>` is specified as the first positional argument then change data relative to that version will be returned.

Example output:

```
$ dat log --limit=1
Version: 6bdd624ae6f9ddb96069e04fc030c6e964e77ac7 [+12, -3]
Date:    April 15th 2015, 7:30PM PST

  added cool csv
```

```
$ dat log --limit=1 --json
{ "change": 1, "version": "6bdd624ae6f9ddb96069e04fc030c6e964e77ac7", links: [...], "puts": 12, "deletes": 3, "date": "2015...", "message": "added cool csv"}
```

`Links` is a list of older versions that are referenced from this current version (forms a directed acyclic graph if drawn).

### dat clone

Clone a new repository from a remote dat to create a new dat.

```
dat clone <repo-url> [output-dir]
```

Your `repo-url` can use any of the available transports. Default transports are `http`, `https`, `ssh` or a relative filesystem path.

Example output:

```
$ dat clone ssh://uni.edu:flights
Pulled 823 changes (93.88 Mb, 3.4 Mb/s).
Clone from remote has completed.
Current version is now b04adb64fdf2203
```

### dat push

Push changes from your local dat to a remote dat

```bash
dat push <remote>
```

#### Options

- `live` - Keep pushing even after the initial pushing finishes
- `bin` - specify path to the `dat` executable if `dat` is not in your path

Example output:

```
$ dat push ssh://192.168.0.5:data
Pushed 438 changes (32.03 Mb, 4.4 Mb/s).
Push completed successfully.
```

### dat pull

Pull new changes from a remote dat into your local dat.

```bash
dat pull <remote>
```

#### Options

- `live` - Keep pulling even after the initial pulling finishes
- `bin` - specify path to the `dat` executable if `dat` is not in your path

Example output:

```
$ dat pull ssh://192.168.0.5:data
Pulled 823 changes (93.88 Mb, 3.4 Mb/s).
Pull completed successfully, you now have 2 forks.
Current version is now b04adb64fdf2203
```

### dat checkout

Non-destructive rollback state to a version in the past

```bash
dat checkout <version-hash>
```

Check out the latest version

```bash
dat checkout latest
```

Example output:

```
$ dat checkout 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
Checked out state of dat to 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
```

### dat datasets

List datasets in the dat

```bash
$ dat datasets
flights
cities
model_data
pickles
```

### dat diff

Generate a diff between two versions of the repository

```
dat diff <versionA> [<versionB>] [--dataset=<name>]
```

If you specify one version, your current version will be used as the other version. Otherwise you can pass two versions.

If the same key is in both versions but the values differ, a diff object will be written to the output. You will get a diff object for each diff that is found. Values that match are skipped.

Example output:

```
$ dat diff 64843f272df
Diff between "Imported csv" and "Re-imported edited csv"
  ? "first":"Max" -> "MAX"
  - "hey": "deleted"
  + "foo": "bar"
Diff between "Initial data import" and "Re-imported edited csv"
  ? "first":"Bob" -> "BOB"
  - "hey": "deleted"
  + "foo": "bar"
```

```
$ dat diff --pretty --json 64843f272df
{
  "key": "1",
  "forks": ["163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502", "64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3" ]
  "versions": [
    {
      "type": "put",
      "version": "163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502",
      "change": 3,
      "key": "1",
      "value": {
        "key": "1",
        "name": "Max"
      }
    },
    {
      "type": "put",
      "version": "64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3",
      "change": 1,
      "key": "1",
      "value": {
        "key": "1",
        "name": "MAX"
      }
    }
  ]
}
<... etc for each key in the diff>
```

### dat merge

Merges two forks

```
dat merge <fork> [-]
```

`<fork>` should be the hash of the fork you want to merge into the fork you are currently on

You can either merge data from a file/STDIN or you can merge based on a built-in strategy.

If using a file/STDIN your file should contain a JSON stream (see below).

If merging a fork, you should specify a strategy option.

Use `dat status` and `dat forks` to determine these values.

#### Options

- `-`: receive resolved changes on stdin
- `left`: pick the left side as the winner
- `right`: pick the right side as the winner
- `random`: pick random side for each key

Example output:

A `dat merge` receives a stream of changes that will be applied to resolve conflicts between two versions.

$ dat merge

Merging from a file:

```
$ cat resolutions.json | dat merge ab3234dfe5
Changes merged successfully.
Current version is now b04adb64fdf2203
```

Merging as a stream using `dat diff`:

```
$ dat diff ab3234dfe5 | <tool> | dat merge ab3234dfe5 -
Changes merged successfully.
Current version is now 98v8catb4bvcddf
```

Merging by picking one side:

```
$ dat merge bdc3ae23cef --left
Changes merged successfully.
Current version is now b2bg304823h32h2
```

#### JSON format

When writing data into a merge operation it should be in the same format as is contained in the individual versions supplied in the `versions` array of `dat diff` output.

`dat merge` expects newline separated JSON objects (ndjson) as input.

Example:

```
{"type":"put","version":"163c6089c3477ee","change":3,"key":"maxogden","value":{"key":"maxogden","name":"Max"}}
{"type":"put","version":"b04adb64fdf2203","change":6,"key":"mafintosh","value":{"key":"mafintosh","name":"Mathias"}}
```

### dat forks

List the current forks

```
dat forks
```

Example output:

```
$ dat forks
64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3 - Imported csv
163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502 - Updated names
```

```
$ dat forks --json
{version: "64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3", message: "Imported csv"}
{version: "163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502", message: "Updated names"}
```

### dat keys

List the keys from a dataset.

```
$ dat keys -d people
maxogden
mafintosh
karissa
```

### Options

- `lt`, `lte`, `gt`, `gte` - specify start/end key range values using less than, less than equals, greater than, greater than equals
- `limit` - default unlimited. specify how many results to receive
- `format` - default `json`. you can also specify `csv`.

### dat files

List the files in the current repository.

```
$ dat files
package.json
```

### Options

`dat files` supports all of the options as `dat keys`

### dat replicate

Same as doing a `dat push` and `dat pull` at the same time. Use it when you are on the other end of a `dat pull` or a `dat push` (e.g. if you are hosting dat on a server).

#### Options

- `bin` - specify path to the `dat` executable if `dat` is not in your path

Example output:

```
$ dat pull ssh://192.168.0.5:~/data
Pushed 403 changes (13.88 Mb).
Pulled 823 changes (93.88 Mb).
Average speed: 4.3 Mb/s.
Replication completed successfully.
```

### dat serve

Create an http endpoint so others can `clone`, `push`, or `pull` data. Default port is 6442, or uses the `PORT` env variable if set.

```
$ dat serve [--port=<number>]
Listening on port 6442
```

#### Options

- `readonly` - run with read only permission, so e.g. people can only clone/pull but not push


### dat destroy

Destroy a repository and all data inside it. Cannot be undone

```
$ dat destroy [--no-prompt]
About to destroy data.dat. This cannot be undone. Are you sure? (y/n): y
Destroyed data.dat
```

#### Options

- `no-prompt` - add this flag to skip the prompt and force the destroy

## dataset commands

These are meant to affect a specific dataset inside a repository.

Currently you **must** specify the dataset when doing any dataset commands.

- `dataset`/`d` - specify the dataset to use.

### dat import

Import key/value data into dat

```bash
dat import <filename> --dataset=<name>
```

### Options

- `key`/`k` - specify which column to use as the primary key (defaults to auto-generated keys)
- `keys`/`ks` - comma-separated list of column names to craft a compound key. sorted ascending by default
- `message`/`m` - a short description of this import

Examples:

Import a json file:

```
$ dat import flights.json
Added 302,143 keys (327.03 Mb, 4.4 Mb/s).
Data added successfully.
Current version is now b04adb64fdf2203
```

Stream data from stdin:

```bash
cat file.json | dat import -
```

### dat export

Stream a range of keys + values out of a dataset.

```bash
dat export
```

Stream data to a file:

```bash
dat export > woah-my-data.json
```

### Options

- `lt`, `lte`, `gt`, `gte` - specify start/end key range values using less than, less than equals, greater than, greater than equals
- `limit` - default unlimited. specify how many results to receive
- `format` - default `json`. you can also specify `csv`.

Example output:

```
$ dat export
{"key": "maxogden", "firstname": "Max", "lastname": "Ogden"}
```

### dat read

Read binary data from a file stored in dat

```
dat read <filename>
```

Example:

```
$ dat read photo.jpg --dataset=photos
```

### dat write

Write binary data into dat. This differs from `import` in that it doesn't parse the file, it just stores it as a binary attachment. `import` is designed for key/value row-like, or tabular data. `write` is meant for large files, blobs, or attachments that you can't parse into rows.

Write a file to dat:

```
dat write <filename> --dataset=<dataset-name>
```

#### Options

`key`/`k`: the name, or lookup key, for the binary file inside dat. If no name is supplied, dat will use the filename as the lookup key.

Example output:

Stream data from stdin, save as 'photo.jpg' (must specify name when using STDIN) in the dataset 'photos' (required):

```bash
cat photo.jpg | dat write - --key=photo.jpg --dataset=photos
```

Write a file by filename (uses `cat.jpg` as the name automatically):

```
$ dat write images/cat.jpg
Storing cat.jpg (8.3 Mb, 38 Mb/s).
Stored cat.jpg successfully.
Current version is now b04adb64fdf2203
```
