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

**01-new-dat.js**

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

**02-put-cat.js**

```js
var createDat = require('dat')
var dat = createDat('./dat-cats', ready)

function ready(err) {
  if (err) return console.error(err)
  
  var cat = {
    key: 'Bob',
    age: 3,
    type: 'Tortoiseshell'
  }
  
  // dat will store our cat data and call `done` when it finishes
  dat.put(cat, done)
  
  function done(err, row) {
    if (err) return console.error('Could not store Bob!', err)
    
    console.log('Stored Bob', row)
  }
}
```

When run successfully the above code should output:

```
$ node 02-put-cat.js
Stored Bob { key: 'Bob', age: 3, type: 'Tortoiseshell', version: 1 }
```

As you can see a `version` number was automatically added to the row data we got back, and it starts at version 1.

