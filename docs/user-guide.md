## Using dat

You can think of dat as a streaming interface for data on the filesystem.

## Try dat interactively

If you haven't yet, please swing over to our [interactive tutorial to try dat now in your browser](http://try-dat.com).

You can still use the user guide below if you're feeling rushed, but the interactive guide has more information.

## Quick walkthrough

Create a new directory.

```
mkdir test
```

Open that directory

```
cd dat-test
```

Make this directory into a dat repository

```
dat init
```

Now you can add a binary file to the dat repository. You can add a message with `-m` and it will get written to the log.

```
dat write http://try-dat.com/static/img/wildcat.jpg -m "Added a wildcat because I can."
```

Check the log:
```
dat log
```

And see the status (should be two files!). Save the current version hash. We'll use it later.
```
dat status
```

And you can add some CSV, if you want to version by row. You can add a primary key, let's use ucr_ncic_code.
```
dat import http://samplecsvs.s3.amazonaws.com/SacramentocrimeJanuary2006.csv -d sacramento-crime -k ucr_ncic_code
```

Then, see the change:
```
dat log
dat status
```

Oops, this was a mistake! If you want to go back in time, just use `checkout` using the version from before:
```
dat checkout <version>
```

## Forking, diffing, merging tables

If you import data after checkout, you'll get a fork, because you added to a version in the past.

```
dat import http://samplecsvs.s3.amazonaws.com/SacramentocrimeJanuary2006.csv -d sacramento-crime -k ucr_ncic_code
dat forks
```

Now, you'll have a forked graph. Check out the diff, here, using the same version from before (experimental):

```
dat diff <version>
```

You can then merge them:
```
dat merge <version1> <version2>
```

Once imported, the data can be forked, diffed, merged, replicated, destroyed, etc.—[see a list of all dat commands](https://github.com/maxogden/dat/blob/master/docs/cli-docs.md) for more.

## How do I use a compound key in dat?

A compound key might be something like 'city', 'state', and 'zip code'. This is where any on its own isn't uniquely identifiable to a row, but all together will create a unique key.

Here, we will create a compound key using these three:

```
dat import cities.csv -d cities -k city -k state -k zipcode
```

Dat will sort these keys and use them with a `+` delimiter, so a row with 'oakland', 'ca', '94607' might be 'oakland+ca+94607'.

## How do I connect a different backend to dat?

In your `package.json` file, under `dat`, add a `backend` entry. Example for `SQL` variants:

```
{
  "name": "mydat",
  "dat": {
    "backend": {
      "module": "sqldown",
      "env": "DAT_TABULAR_DATABASE"
    }
  }
}
```

### Options

Every addon has two available configuration arguments right now:

`module`: Any npm module that implements the [AbstractLevelDOWN api](https://github.com/Level/abstract-leveldown) will be compatible with dat. You'll need to install this module by typing `npm install <module> [--save]`.

`env`: The environment variable that represents the `path` or `url` argument to the backend.


### Supported Addon Types

`backend`: where tabular data is stored.
`blobs`: *coming soon*
