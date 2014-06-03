# Example usage

## make a new folder and turn it into a dat store

```
mkdir foo
cd foo
dat init
```

## put a JSON object into dat

```
echo '{"hello": "world"}' | dat --json
```

## stream a CSV into dat

```
cat some_csv.csv | dat import --csv
```

use a custom newline delimiter:

```
cat some_csv.csv | dat import --csv --newline $'\r\n'
```

use a custom value separator:

```
cat some_tsv.tsv | dat import --csv --separator $'\t'
```

## specify a primary key to use

```
echo $'a,b,c\n1,2,3' | dat import --csv --primary=a
echo $'{"foo":"bar"}' | dat import --json --primary=foo
```

## stream the most recent of all rows

```
dat cat
```

## view raw data in the store

```
dat dump
```

## start a dat server

```
dat listen
```

then you can poke around at the REST API:

```
/api/changes
/api/changes?data=true
/api/package
/api/:docid
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

## grab all the NPM registry metadata

With

```
dat clone <repository> [<directory>]
```

For example:

```
dat clone http://dat-npm.mathiasbuus.eu
```

## delete the dat folder (removes all data + history)

```
rm -rf .dat
```

## dat import

you can pipe line separated JSON data into dat on stdin and it will be stored

```
cat foo.line-separated-json-objects | dat import --json
```
