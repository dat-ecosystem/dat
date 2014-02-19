# random technical notes

## input formats

all are streaming parsers

- line delimited json (default, powered by [ldjson-stream](http://npmjs.org/ldjson-stream) or [binary-split](http://npmjs.org/binary-split))
- .csv (powered by [binary-csv](http://npmjs.org/binary-csv))
- .json (w/ [JSONStream](http://npmjs.org/JSONStream) query syntax)
- .buff ([multibuffer](http://npmjs.org/multibuffer))
- potentially redis protocol, though it may required features we don't need

## on disk format

when inserting data into dat you have to specify a primary column with unique ids. if one isn't specified then unique monotonic unique ids will be generated for each row. data comes out of dat in primary key sorted order.

for the following explanations refer to this example CSV:

```
a,b,c
1,2,3
```

in dat all data are stored as [multibuffers](http://npmjs.org/multibuffer) (aka 'buff'), which represents a single row, where each cell is a buffer and the row is persisted to disk as a multibuffer. each dat store has a header array, so for the above csv it would be `['a','b','c']`

if data gets written to dat later on that has a fourth column that column value will have to get added to the header array

for example, if you convert the above csv to json it would be `{"a": 1, "b": 2, "c": 3}`. Storing this on disk as JSON would take up 19 bytes, storing the header array once is 13 bytes and then the cells 'a', 'b', 'c' is only ~5 bytes. with millions of rows the space savings add up.


### keys

```
ÿdÿfooÿ01ÿ04
````

which breaks down to:

```
d id revision sequence
```

keys are prefixed with `d` which stands for `data`

### values

32bit hash of the schema + multibuffer

## schema versions

1. schemas (e.g. columns in a table) are append-only for backwards compatibility + simplicity reasons
2. deletes are possible but require compaction
3. if you try and write data to dat that doesn't match schemas you will get an error (this includes sync)
4. the correct way to merge non-matching data is to transform data to match the local schema
5. if you really want to merge two non-matching schemas you can do it with an override, but then you'll have weird sparse columns (not recommended)

#### storage considerations

to make a broad generalization: most tabular data will have short contents. rather than optimizing dat for spreadsheets where one cell might contain megabytes of data I have decided to instead optimize it for smaller cell values while also respecting disk space usage. this opinion may change in the future!

##### rows over cells

cell based storage was discussed here: https://github.com/maxogden/dat/issues/10#issuecomment-23287110

the downside is that it adds complexity as you have to store revision numbers for every cell. what isn't mentioned in that thread is the performance impact. when keys are, say, 10 bytes and values are 5 bytes (or 1 byte as in the above example csv) then write throughput with leveldb goes down as opposed to row based storage where keys are the same but values are usually in 100 byte range (depending on how many columns exist of course, but roughly hundreds - thousands of bytes per row rather than double digits as with cellular storage)

##### delimited vs framed

csv is a delimited format, whereas things like msgpack or the redis protocol are framed formats.

to store the above csv in a simple framed format would look something like this

```
[4 byte length integer][first cell][4 byte length integer][second cell][4 byte length integer][third cell]
```

or, when written out with 4byte integer (UInt32BE) framing length precision:

```
[0001 1 0001 2 0001 3]
```

which means for 3 bytes of data there are 12 bytes of overhead (4 bytes for each cell). instead of using fixed width framing sections dat uses [varints](https://npmjs.org/package/varint) instead

generally speaking, delimited data is more intensive as you have to scan the full data for all of the instances of your delimiter, but for smaller values the performance impact shouldn't be as noticable. the benefit is that you can store single byte delimiters instead of having to use larger bit precision framing indexes

#### the .buff format

buff is the abbreviated name for a [multibuffer](https://github.com/brycebaril/multibuffer), which is the data produced by the module of the same name by `node_redis` co-maintainer [brycebaril](https://github.com/brycebaril/)

a buffer is just a name for a group of bytes. buffers can be any length, from a few bytes up to gigabytes in size. in node you receive data in buffers when you read from files or download things over the network. buffers are pretty fast!

multibuffers are similar to a single row in a csv -- a bunch of individual values all grouped together. they aren't tuples/objects -- just values. in dat we combine all the individual cells into rows for a few reasons -- but primarily to make dat really fast. 

for example, if you have these three values: `taco`, `pizza`, `walrus` and you wanted to combine them and store them on disk, you can turn them into a single multibuffer:

```
var multibuffer = require('multibuffer')
var buff = multibuffer.pack([new Buffer('taco'), new Buffer('pizza'), new Buffer('walrus')])
```

in the above code `buff` is now also a `Buffer`, but it contains all three of the buffers we put into it. To reverse the process you can use `unpack`:

```
var unpackedBuffers = multibuffer.unpack(buff)
```

the actual composition of a buff is pretty simple -- there are just two repeating sections:

```
[frame - how many bytes long the first buffer is, stored as a varint][data - the first buffer]
```

so for the above example the buffer would be something like this:

```
4taco5pizza6walrus
```

