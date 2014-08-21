# Using `require('dat')` from Node.js

## A guide for consuming the dat JavaScript API

You can use dat from the command-line, or using our dat editor UI, but sometimes you need to write custom node code to get stuff done.

You can simple `npm install --save dat` and then `require('dat')` to get started using dat from Node.js. Node version 0.10 or great is required.

If you haven't done much node programming before and aren't used to some of the conventions we highly recommend you take the [Learn You Node course from NodeSchool](http://nodeschool.io/)

All of the code examples below are also available individually in the `docs/dat-js-examples` directory of this repo.

The dat interface is a superset of [levelup](https://github.com/rvagg/node-levelup), the LevelDB client library for Node.js. While not 100% compatible we try and copy as much as possible.

This is a high-level guide. For detailed documentation on the dat APIs please see the [JS API document](js-api.md).

This guide will primarily use JSON data. dat also supports CSV data as well as Protocol Buffers binary encoded data, but JSON is the simplest for the purposes of learning the dat API.

## Creating a dat instance

To work with dat you need a working directory where data will be stored. If a dat is initialized inside the directory `/home/data` it will store all of it's data at `/home/data/.dat` and it will create a config file `dat.json` at `/home/data/dat.json`. `dat.json` is used to store user-specified configuration information like the name of the dataset, the author, any data transformations that should run, etc.

By default when you create a new dat instance from Node.js the `.dat` folder and `dat.json` file will be created for you if they don't exist already.

[**01-new-dat.js**](dat-js-examples/01-new-dat.js)

```js
var createDat = require('dat')

// create or load a dat database from the `dat-test` folder
// the './dat-test' folder will be created if it does not already exist
// when dat has loaded/initialized it will call your callback (in this case the `ready` callback)
var myDat = createDat('./dat-test', ready)

function ready(err) {
  // an error might happen if the dat folder is corrupted or if your hard drive randomly explodes etc
  if (err) return console.error('Uh-oh, there was an error loading dat:', err)
  
  // now that dat has loaded `myDat` from above can be safely used
  // this will log the dat module version number that is being used
  console.log(myDat.version)
}
```

## Working with data one row at a time

As explained in the [importing data guide](importing.md), there are two main data stores in dat: the tabular store and the blob store. First we will show you how to work with data in the tabular store and then later how to attach blobs to rows.

The CRUD (Create-Read-Update-Destroy) APIs in dat are the simplest way of working with data in the tabular store. They are `dat.get`, `dat.put` and `dat.delete`.

### Put a new row into the tabular store

There are two special fields for data in the tabular store: `key` and `version`. If you don't specify a `key` a new unique one will randomly generated for you. If you do include a `key` in your data it **must** be unique, otherwise you will likely get a conflict error when you try and write the data into dat.

The `version` field is simply an auto-incrementing number that starts at 1 and increases every time you update the data in a row.

Imagine you work at a cat adoption shelter and you want to use dat to track big small cat data (lots of data about domestic sized cats). Let's use the cat name as the key, and put the first cat into dat:

[**02-put-cat.js**](dat-js-examples/02-put-cat.js)

```js
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  var cat = {
    key: 'Bob',
    age: 3,
    type: 'White fur'
  }
  
  // dat will store our cat data and call `done` when it finishes
  dat.put(cat, done)
}

function done(err, row) {
  if (err) return console.error('Could not store Bob!', err)
  
  console.log('Stored Bob', row)
}
```

When run successfully the above code should output:

```
$ node 02-put-cat.js
Stored Bob { key: 'Bob', age: 3, type: 'White fur', version: 1 }
```

As you can see a `version` number was automatically added to the row data we got back, and it starts at version 1.

### Updating an existing row


If Bob has a birthday and turns 4 we need to update the data:


[**03-update-cat.js**](dat-js-examples/03-update-cat.js)

```js
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  // first lets get the latest version of bob from dat
  dat.get('Bob', gotBob)
}

function gotBob(err, bob) {
  if (err) return console.error('Could not get Bob!', err)
  
  // update bobs age and put him back in the database
  bob.age = 4
  dat.put(bob, done)
}

function done(err, updated) {
  if (err) return console.error('Could not update Bob!', err)
  
  // now bob is at version 2
  console.log('Updated Bob:', updated)
}
```

A successful run of the above code will produce:

```
$ node 03-update-cat.js
Updated Bob: { key: 'Bob', version: 2, age: 4, type: 'White fur' }
```

Note that the `version` is required to update an existing key. If you try and write data for a key that already exists, and you don't include a version or you include an out of date version the `put` will fail and return a conflict error.

### Attaching a blob to a row

If you have some data that is not tabular, such as a MP3 file, you can use the dat blob API. The two main methods are `dat.createBlobWriteStream` and `dat.createBlobReadStream`.

In order to store a blob you must 'attach' it to a row in the tabular store. You can either make a new row or attach to an existing row. The blobs metadata will be stored in row object under the `blobs` field.

[**04-blob-write.js**](dat-js-examples/04-blob-write.js)

```js
var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  // first lets get the latest version of bob from dat
  dat.get('Bob', function(err, bob) {
    if (err) return console.error('Bob is not in this dat!', err)
    
    // stream a photo from the hard drive
    var bobPicture = fs.createReadStream('./bob.png')
    
    // the first argument is the filename it should get labeled with in dat
    // the second argument is the row to attach the blob to
    var blobWriteStream = dat.createBlobWriteStream('bob.png', bob, done)
    
    bobPicture.pipe(blobWriteStream)
  })
}

function done(err, row) {
  if (err) return console.error('Could not store the Bob photo!', err)
  
  console.log('Stored the Bob photo', row)
}
```

Running the above code should produce:

```
$ node 04-blob-write.js
Stored the Bob photo { key: 'Bob',
  version: 3,
  age: 4,
  type: 'White fur',
  blobs: {
    'bob.png': {
      hash: 'acb21f0603649973c264019c1699dbe93af9c7f102134aabb8155d04870a95b4',
      size: 170741
    }
  }
}
```

Now the row is at version 3, and the metadata for the blob that we just streamed into dat is stored under the `blobs` key.

To get the blob data back out again you can use `dat.createBlobReadStream`.

### Getting older versions

Dat stores all previous versions of both rows and blobs. To get a row at a specific version, you can pass in the version argument to `dat.get`:

[**05-get-old-version.js**](dat-js-examples/05-get-old-version.js)

```js
var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  dat.get('Bob', {version: 1}, function(err, bob) {
    if (err) return console.error('Bob at version 1 could not be got!', err)
    
    console.log(bob)
  })
}
```

Running this should output:

```
$ node 05-get-old-version.js
{ key: 'Bob', version: 1, age: 3, type: 'White fur' }
```

If you want to get all of the available versions for a key you can use `dat.versions`, which is a convenient wrapper around the lower level `dat.createVersionStream`:

[**06-get-all-versions.js**](dat-js-examples/06-get-all-versions.js)

```js
var fs = require('fs')
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  dat.versions('Bob', function(err, versions) {
    if (err) return console.error('An error occurred while getting versions:', err)
    
    if (!versions) return console.log('No versions found for Bob')
    console.log(versions)
  })
}
```

Running the above should result in:

```
$ node 06-get-all-versions.js
[ { key: 'Bob', version: 1, age: 3, type: 'White fur' },
  { key: 'Bob', version: 2, age: 4, type: 'White fur' },
  { key: 'Bob',
    version: 3,
    age: 4,
    type: 'White fur',
    blobs: { 'bob.png': [Object] } } ]
```

The call to `dat.versions` returned an array containing every version of the `Bob` key, in order from 1 up.
