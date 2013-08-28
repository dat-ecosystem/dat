## Example usage

```
# make a new folder and turn it into a dat store
mkdir foo
cd foo
dat init

# put a single key/value into dat
dat crud put foo bar

# put a JSON object into dat
echo '{"hello": "world"}' | dat

# retrieve a single row by key
dat crud get foo
dat crud get hello

# stream the most recent of all rows
dat cat

# pipe dat into itself (increments revisions)
dat cat | dat

# view updated data
dat cat

# view raw data in the store
dat dump

# compact data (removes unnecessary metadata)
dat compact

# start a dat server
dat serve

# delete the dat folder (removes all data + history)
rm -rf .dat
```

## Command reference

There are subject to change. See `lib/commands.js` for the source code

### dat init

turns the current folder into a new empty dat store

### dat init --remote http://localhost:6461/_archive

initializes a new dat store by copying a remote dat server

### dat

you can pipe line separated JSON data into `dat` on stdin and it will be stored. otherwise entering `dat` with no arguments will just show you the usage instructions

### dat pull

pulls new changes/data from a remote dat server

### dat serve

starts an http + tcp server on port `6461` that serves the data in the current dat store

### dat compact

removes duplicate copies of documents

### dat cat

writes line separated JSON objects to stdout, one object per key, only the newest version of each key, sorted by key

### dat dump

dumps out the entire dat store to stdout as JSON

### dat crud

used for debugging. usage: `dat crud <action> <key> <value>` e.g. `dat crud get foo` or `dat crud put foo bar`
