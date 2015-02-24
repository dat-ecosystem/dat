# dat command line API

This is the proposed CLI API for our Beta release. Please leave feedback [in this thread](https://github.com/maxogden/dat/issues/195).

## dat

Lists available commands and shows instructions

```bash
dat
```

## dat status

Show current status, including row count, file count, last updated, current branch, current head, checkout status

```bash
dat status
```

## dat log

Show history

```bash
dat log
```

## dat changes

Stream changes out in historical order as ndjson

```bash
dat changes
```

## dat branches

View a list of branches

```bash
dat branches
```

## dat merge

Merge branches

```bash
dat merge a b -s "gasket run merge" --dry-run
```

## dat compare

Check for potential conflicts during a merge between branches and list keys that will conflict

```
dat compare a b
```

## dat checkout

Set head to a point in history

```bash
dat checkout <commit-hash or tag or branch hash or branch name>
```

Check out latest commit on default branch

```bash
dat checkout default
```

Check out latest commit on some other branch

```bash
dat checkout add-names
```

Check out older commit by hash

```bash
dat checkout n2iu3h492uhbi234hoiu
```

### dat add

Import a file. High level. Prompts for missing info

```bash
dat add <filename or directory>
  # optional arguments, will prompt if not supplied
  -n <dataset-name> # the name of the dataset to create
  -f <data-format> # how to parse the file to add
  --help # show help
```

## dat datasets

Lists datasets

```bash
dat datasets
```

### dat datasets delete

Remove (destructively) a dataset

```bash
dat datasets delete <dataset-name> 
```

## dat files

List files in a dataset

```bash
dat files <dataset-name>
```

### dat files get

Stream a file from a dataset

```bash
dat files get <dataset> <filename>
```

### dat files add

Stream a file into a dataset

```bash
dat files add <dataset> <filename>
```

Possible examples of updating an existing file:

```bash
$ dat files add cities my_us_cities_viz.png
This will override my_us_cities_viz.png at c2342d (y/n): y
...done
maxogden updated my_us_cities_viz.png to be253f on Sat Jan 17, 9:33pm
```

```bash
$ dat files add cities my_us_cities_viz.png --no-prompt/--force(?)
maxogden updated my_us_cities_viz.png to be253f on Sat Jan 17, 9:33pm
```

### dat files delete

Remove a file from a dataset

```bash
dat files delete <dataset> <filename>
```

### dat rows get

Cat all rows in all datasets as ndjson:

```bash
dat rows get
```

Get rows from a dataset:


```bash
dat rows get <dataset>
```

Get a single row from a dataset:

```bash
dat rows get <dataset> <key>
```

Get rows with options:

```bash
dat rows get --gte foo --lt z --limit 1
```


### dat rows add

Add data to a dataset.

Add a single row:

```bash
dat rows add <dataset> <key> <value>
```

Open a writable stream:

```bash
dat rows add <dataset>
```

### dat rows delete

Delete a single row from a dataset

```bash
dat rows delete <dataset> <key>
```

