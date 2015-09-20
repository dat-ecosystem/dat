## Using dat

You can think of dat as a streaming interface for data on the filesystem.

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

Now you can add a file to the dat repository.

```
dat add
```

import a CSV or newline-delimited JSON file to the dat repository (for example, [an exoplanet orbit CSV file](http://exoplanets.org/csv-files/exoplanets.csv)) by running `dat import http://exoplanets.org/csv-files/exoplanets.csv -d exoplanets`.

Once imported, the data can be forked, diffed, merged, replicated, destroyed, etc.—[see a list of all dat commands](https://github.com/maxogden/dat/blob/master/docs/cli-docs.md) for more.

Run the tutorial at http://try-dat.com for a quick start to the basic collaborative command-line use cases.

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
