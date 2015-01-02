# Example usage

## make a new folder and turn it into a dat store

```
mkdir foo
cd foo
dat init
```

## put a JSON object into dat

```
echo '{"hello": "world"}' | dat import --json
```

## stream the most recent of all rows

```
dat cat
```

## stream a CSV into dat

```
cat some_csv.csv | dat import --csv
```

or

```
dat import --csv some_csv.csv
```

use a custom newline delimiter:

```
cat some_csv.csv | dat import --csv --newline $'\r\n'
```

use a custom value separator:

```
cat some_tsv.tsv | dat import --csv --separator $'\t'
```

## stream NDJSON into dat

You can pipeline Newline Delimited JSON ([NDJSON](http://ndjson.org/)) into dat on stdin and it will be stored

```
cat foo.ndjson | dat import --json
```

## specify a primary key to use

```
echo $'a,b,c\n1,2,3' | dat import --csv --primary=a
echo $'{"foo":"bar"}' | dat import --json --primary=foo
```

## attach a blob to a row

```
dat blobs put jingles jingles-cat-photo-01.png
```

## stream a blob from a row

```
dat blobs get jingles jingles-cat-photo-01.png
```

## add a row from a JSON file

```
dat rows put burrito-recipe.json
```

## get a single row by key

```
dat rows get burrito
```

## delete a single row by key

```
dat rows delete burrito
```

## but rows are never truly deleted. you can always go find a row at the version it was last seen. in this case, that row was at version 1

```
dat rows get burrito 1
```

## start a dat server

```
dat listen
```

then you can poke around at the REST API:

```
/api/changes
/api/changes?data=true
/api/metadata
/api/rows/:docid
POST /api/bulk content-type: application/json (newline separated json)
```

## pull data from another dat

```
dat pull http://localhost:6461
```

## push data to another dat

```
dat push http://localhost:6461
```

## delete the dat folder (removes all data + history)

```
dat clean
```

## view raw data in the store

```
npm install superlevel -g
superlevel .dat/store.dat createReadStream
```
