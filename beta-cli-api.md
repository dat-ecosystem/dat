# dat command line API

This is the proposed CLI API for our Beta release. Please leave feedback [in this thread](https://github.com/maxogden/dat/issues/195).

- [repository commands](#repository-commands)
- [dataset commands](#dataset-commands)

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
- `json` (boolean) - pass this option to change the response format for status/response messages to JSON for easy parsing

Example output:

```
$ dat
usage: dat <command(s)> [-flag] [--key value]

commands:
  init      initialize a new dat store in a directory
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
Checked out to 8eaf3b0739d32849687a544efae8487b5b05df52
438 files, 32 rows, 3 commits, 143 Mb total
Last updated 3 seconds ago
```

### dat push

Push changes from your local dat to a remote dat

```bash
dat push <remote>
```

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

Example output:

```
$ dat pull ssh://192.168.0.5:~/data
Pulled 823 changes (93.88 Mb, 3.4 Mb/s).
Pull completed successfully.
```

### dat replicate

Same as doing a `dat push` and `dat pull` at the same time. Use it when you are on the other end of a `dat pull` or a `dat push` (e.g. if you are hosting dat on a server).

### dat changes

Stream changes out in historical order as json

```bash
dat changes
```

Example output:

#### TODO Finalize exact change output

```
$ dat changes --limit=2
{ "change": 1, "key": "foo", "hash": "6bdd624ae6f9ddb96069e04fc030c6e964e77ac7", "from": 0, "to": 1}
{ "change": 2, "key": "foo", "hash": "7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517", "from": 1, "to": 2}
```

### dat checkout

Non-destructive rollback state to a hash in the past

```bash
dat checkout <commit-hash>
```

Check out latest commit on default branch

```bash
dat checkout latest
```

Example output

```
$ dat checkout 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
Checked out state of dat to 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
```

## dataset commands

These are meant to affect a specific dataset inside a repository. Each dataset is a folder inside the repository.

You can either run these commands from inside the dataset folder, or by explicitly specifying it with the dataset option:

- `dataset`/`d` - specify the dataset to use. defauts to the dataset in the folder you are in.

### dat add

Add bulk data to dat

```bash
dat add <filename>
```

Stream data from stdin:

```bash
cat file.json | dat add -
```

Example output:

```
$ dat add flights.json -d flights
Added 302,143 rows (32.03 Mb, 4.4 Mb/s).
Data added successfully.
```

### dat get

Get a key or a range of keys out of a dataset

```
dat get <single key> OR [range options]
```

### Range options

If there are specified, the `<key>` you pass to get will be ignored and you may receive many keys

- `lt`, `lte`, `gt`, `gte` - specify start/end key range values using less than, less than equals, greater than, greater than equals
- `limit` - default unlimited. specify how many results to receive
- `reverse` - default false. if true keys will come out in reverse sorted order

Example output:

```
$ dat get uw60748112
{"content":"row","key":"uw60748112","version":"5abd6625cd2e64a116628a9a306de2fbd73a05ea5905e26d5d4e58e077be2203","value":{"time":"2014-04-30T00:09:37.000Z","latitude":"46.7557","longitude":"-121.9855","place":"24km ESE of Eatonville, Washington","type":"earthquake"}}
```

### dat put

Put a single key:

```bash
dat put <key> <value>
```

Example output:

```
$ dat put uw60748112 "{time:2014-04-30T00:09:37.000Z,latitude:46.7557,longitude:-121.9855,place:24km ESE of Eatonville, Washington,type:earthquake}"
Done adding data.
```
