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

## dat checkout

Set head to a point in history

```bash
dat checkout <commit-hash or tag>
```

Check out latest

```bash
dat checkout latest
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

### dat datasets add

Create a dataset

```bash
dat datasets add <dataset-name> 
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

## dat rows

cat rows as ndjson

```bash
dat rows <dataset>
```

### dat rows add

Add a single row to a dataset:

```bash
dat rows add <dataset> <key> <value>
```

### dat rows delete

Delete a single row from a dataset

```bash
dat rows delete <dataset> <key>
```
