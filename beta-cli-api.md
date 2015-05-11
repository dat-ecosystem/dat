# dat command line API

This is the proposed CLI API for our Beta release. Please leave feedback [in this thread](https://github.com/maxogden/dat/issues/195).

## dat

Lists available commands and shows instructions

```bash
dat
```

Example output:

```
$ dat
usage: dat <command(s)> [--flag] [--key=value]

commands:
  init      initialize a new dat store in a directory
  checkout  dat will operate at a particular head
  add       import a file into dat
  push      push data to a remote dat
  pull      pull data from a remote dat
  export    streams data to a file in a given format
  heads     list heads of the current dat
  diff      see differences between two heads
  merge     merge two heads
  cat       streams all data out of dat
  get       get rows in a dataset
  put       put a row into a dataset

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

### dat add

Add bulk data to dat

```bash
dat add <filename> -d <dataset-name> -f <data-format>
```

Stream data through stdin:

```bash
cat file.json | dat add -
```

Example output:

```
$ dat add flights.json -d flights
Added 302,143 rows (32.03 Mb, 4.4 Mb/s).
Data added successfully.
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

### dat get

Get a single row:

```bash
dat get <key>
```

Get a range of keys (outputs json):

```bash
dat get --gte b --lt d --limit 1 -d my-dataset
```

Example output:

```
$ dat get uw60748112
{"content":"row","key":"uw60748112","version":"5abd6625cd2e64a116628a9a306de2fbd73a05ea5905e26d5d4e58e077be2203","value":{"time":"2014-04-30T00:09:37.000Z","latitude":"46.7557","longitude":"-121.9855","place":"24km ESE of Eatonville, Washington","type":"earthquake"}}
```


### dat put

Put a single row:

```bash
dat put <key> <value> -d my-dataset
```

Example output:

```
$ dat put uw60748112 "{time:2014-04-30T00:09:37.000Z,latitude:46.7557,longitude:-121.9855,place:24km ESE of Eatonville, Washington,type:earthquake}"
Done adding data.
```

