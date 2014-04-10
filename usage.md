## Example usage

```
# make a new folder and turn it into a dat store
mkdir foo
cd foo
dat init

# put a JSON object into dat
echo '{"hello": "world"}' | dat --json

# stream a CSV into dat
cat some_csv.csv | dat --csv
cat some_csv.csv | dat --csv -d $'\r\n' # custom line delimiter, --delimiter= works too

# specify a primary key to use
echo $'a,b,c\n1,2,3' | dat --csv --primary=a
echo $'{"foo":"bar"}' | dat --json --primary=foo

# stream the most recent of all rows
dat cat

# view raw data in the store
dat dump

# start a dat server
dat serve  

then you can poke around at the REST API:

/_changes
/_changes?include_data=true
/_package
/:docid
POST /_bulk content-type: application/json (newline separated json)

# pull data from another dat
dat pull http://localhost:6461

# push data to another dat
dat push http://localhost:6461

# grab all the recent crime in Oakland
dat clone http://oaklandcrime.dathub.org

# delete the dat folder (removes all data + history)
rm -rf .dat
rm package.json

# dat

you can pipe line separated JSON data into `dat` on stdin and it will be stored.
otherwise entering `dat` with no arguments will just show you the usage instructions

# dat init

turns the current folder into a new empty dat store

# dat init --remote http://localhost:6461/_archive

initializes a new dat store by copying a remote dat server
```