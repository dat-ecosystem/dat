# dat command line API

This is the proposed CLI API for our Beta release. Please leave feedback [in this thread](https://github.com/maxogden/dat/issues/195).

- [repository commands](#repository-commands)
  - [dat](#dat)
  - [dat init](#dat-init)
  - [dat status](#dat-status)
  - [dat push](#dat-push)
  - [dat pull](#dat-pull)
  - [dat replicate](#dat-replicate)
  - [dat versions](#dat-versions)
  - [dat checkout](#dat-checkout)
  - [dat diff](#dat-diff)
  - [dat merge](#dat-merge)
- [dataset commands](#dataset-commands)
  - [dat import](#dat-import)
  - [dat export](#dat-export)
  - [dat write](#dat-write)
  - [dat read](#dat-read)
  - [dat get](#dat-get)

## repository commands

### dat

Lists available commands and shows instructions

```bash
dat
```

### Options

Options have shorthand `-` and long form `--` variations:

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
- `help`/`h` (boolean) - pass this option to show the help for a command
- `log` (default 'text') - set this to 'json' to change the response format logging for status/response messages to JSON for easy parsing
- `checkout`

Example output:

```
$ dat
usage: dat <command(s)> [-flag] [--key value]

commands:
  init      initialize a new dat in a directory
  checkout  dat will operate at a particular head
  add       import a file into dat
  push      push data to a remote dat
  ... etc

type `dat command --help` to view detailed help about a specific subcommand
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
Initialized a new dat at /test/.dat
```

### dat status

Show current status, including row count, file count, last updated

```bash
dat status
```

Example output:

```
$ dat status
Current version is now 8eaf3b0739d32849687a544efae8487b5b05df52
438 keys, 32 files, 3 commits, 143 Mb total
Last updated 3 seconds ago
```

### dat push

Push changes from your local dat to a remote dat

```bash
dat push <remote>
```

#### Options

- `live` - Keep pushing even after the initial pushing finishes

Example output:

```
$ dat push ssh://192.168.0.5:~/data
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

Example output:

```
$ dat pull ssh://192.168.0.5:~/data
Pulled 823 changes (93.88 Mb, 3.4 Mb/s).
Pull completed successfully.
Current version is now b04adb64fdf2203
```

### dat replicate

Same as doing a `dat push` and `dat pull` at the same time. Use it when you are on the other end of a `dat pull` or a `dat push` (e.g. if you are hosting dat on a server).

Example output:

```
$ dat pull ssh://192.168.0.5:~/data
Pushed 403 changes (13.88 Mb).
Pulled 823 changes (93.88 Mb).
Average speed: 4.3 Mb/s.
Replication completed successfully.
```

### dat versions

Stream versions out in historical order as json

```bash
dat versions
```

Example output:

```
$ dat versions --limit=2
{ "change": 1, "version": "6bdd624ae6f9ddb96069e04fc030c6e964e77ac7", links: [...], "puts": 12, "deletes": 3, "date": "2015..."}
{ "change": 2, "version": "7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517", links: [...], "puts": 0, "deletes": 2, "date": "2015..."}
```

`Links` is a list of older versions that are referenced from this current version (forms a directed acyclic graph if drawn).


### dat checkout

Non-destructive rollback state to a hash in the past

```bash
dat checkout <commit-hash>
```

Check out latest commit on default branch

```bash
dat checkout latest
```

Example output:

```
$ dat checkout 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
Checked out state of dat to 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
```

### dat diff

Generate a diff between two versions of the repository

```
dat diff <versionA> <versionB>
```

If the same key is in both versions but the values differ, a diff object will be written to the output. You will get a diff object for each diff that is found.

Example output:

```
$ dat diff --pretty 163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502 64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3
{
  "key": "1",
  "versions": [
    {
      "type": "put",
      "version": "163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502",
      "change": 3,
      "key": "1",
      "value": {
        "key": "1",
        "name": "Max"
      },
      "checkout": "163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502"
    },
    {
      "type": "put",
      "version": "64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3",
      "change": 1,
      "key": "1",
      "value": {
        "key": "1",
        "name": "MAX"
      },
      "checkout": "64843f272df9526fb04adb64fdf220330c9a29a8104c9ae4dead6b0aab5748e3"
    }
  ]
}
```

### dat merge

Merge two checkouts of a dataset into a single checkout.

```
dat merge <versionA> <versionB> <file>
```

#### Options
`--merge-tool`: run the given merge tool to assist in resolving conflicts manually.

`-` for <file>: receive resolved changes on stdin


Example output:

```
$ dat merge ab3234dfe5 bdc3ae23cef --merge-tool="my-merge-tool.sh"
Changes resolved successfully.
Current version is now b04adb64fdf2203
```

#### Merge tools

A `dat merge` receives a stream of changes that will be applied to resolve conflicts between two versions. In this example, the `<merge-function/tool>` decides which change to keep between the versions suppled in a `dat diff`, outputting the json for each kept change to stdout.

```
$ dat diff ab3234dfe5 bdc3ae23cef | <merge-function/tool> | dat merge ab3234dfe5 bdc3ae23cef -
Changes resolved successfully.
Current version is now b04adb64fdf2203
```


## dataset commands

These are meant to affect a specific dataset inside a repository. Each dataset is a folder inside the repository.

You can either run these commands from inside the dataset folder, or by explicitly specifying it with the dataset option:

- `dataset`/`d` - specify the dataset to use. defauts to the dataset in the folder you are in.

### dat import

Import key/value data into dat

```bash
dat import <filename>
```

Stream data from stdin:

```bash
cat file.json | dat import -
```

Example output:

```
$ dat import flights.json
Added 302,143 keys (32.03 Mb, 4.4 Mb/s).
Data added successfully.
Current version is now b04adb64fdf2203
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
- `versions` - boolean, default `false`. if `true` it will include the `version` hash along with the key/value pair when exporting it


Example output:
```
$ dat export
{"content":"row","key":"1","version":"9e4629196e4db21a244fad8c8a989847fa3827e5747d2ad392363e46223fa888","value":{"key":"1","name":"MAX"}}
{"content":"row","key":"1","version":"163c6089c3477eecfa42420b4249f481b61c30b63071079e51cb052451862502","value":{"key":"1","name":"Max"}}
```

### dat write

Write binary data into dat. This differs from `import` in that it doesn't parse the file, it just stores it as a binary attachment. `import` is designed for key/value row-like, or tabular data. `write` is meant for large files, blobs, or attachments that you can't parse into rows.

Write a file to dat:

```
dat write <path-to-file>
```

Stream data from stdin:

```bash
cat photo.jpg | dat write photo.jpg -
```

#### Options

`name/n`: the name, or lookup key, for the binary file inside dat. If not supplied, will use the 0 position argument for the path to the file as the lookup key.

Example output:

```
$ dat write /some/path/to/photo.jpg --name=photo.jpg
Storing photo.jpg (8.3 Mb, 38 Mb/s).
Stored photo.jpg successfully.
Current version is now b04adb64fdf2203
```

### dat read

Read binary data from a file stored in dat

```
dat read <filename>
```

Example output:

```
$ dat read photo.jpg
<binary data here>
```

### dat get

Get a single key + value out of a dataset

```
dat get <key>
```

Example output:

```
$ dat get uw60748112
{"key":"uw60748112","version":"5abd6625cd2e64a116628a9a306de2fbd73a05ea5905e26d5d4e58e077be2203","value":{"time":"2014-04-30T00:09:37.000Z","latitude":"46.7557","longitude":"-121.9855","place":"24km ESE of Eatonville, Washington","type":"earthquake"}}
```
