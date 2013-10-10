# random technical notes

## input formats

all are streaming parsers

- line delimited json (default, powered by [ldjson-stream](http://npmjs.org/ldjson-stream) or [binary-split](http://npmjs.org/binary-split))
- .csv (powered by [binary-csv](http://npmjs.org/binary-csv))
- .json (w/ [JSONStream](http://npmjs.org/JSONStream) query syntax)
- .buff ([multibuffer](http://npmjs.org/multibuffer))
- potentially redis protocol, though it may required features we don't need

## on disk format

for the following explanations refer to this example CSV:

```
a,b,c
1,2,3
```

all data should be stored as csv formatted rows. each dat store has a header array, so for the above csv it would be `['a','b','c']`

if data gets written to dat later on that has a fourth column that column value will have to get added to the header array

for example, if you convert the above csv to json it would be `{"a": 1, "b": 2, "c": 3}`. Storing this on disk as JSON would take up 19 bytes, storing the header array once is 13 bytes and then the value 'a,b,c' is only 5 bytes. with millions of rows the space savings add up.

#### storage considerations

##### rows over cells

cell based storage was discussed here: https://github.com/maxogden/dat/issues/10#issuecomment-23287110

the downside is that it adds complexity as you have to store revision numbers for every cell. what isn't mentioned in that thread is the performance impact. when keys are, say, 10 bytes and values are 5 bytes (or 1 byte as in the above example csv) then write throughput with leveldb goes down as opposed to row based storage where keys are the same but values are usually in 100 byte range (depending on how many columns exist of course, but roughly hundreds - thousands of bytes per row rather than double digits as with cellular storage)

##### delimited vs framed

csv is a delimited format, whereas things like msgpack or the redis protocol are framed formats.

to store the above csv in a framed format would look something like this

```
[4 byte length integer][first cell][4 byte length integer][second cell][4 byte length integer][third cell]
```

or, when written out with 4byte integer (UInt32BE) framing length precision:

```
[000110001200013]
```

which means for 3 bytes of data there are 12 bytes of overhead (4 bytes for each cell)

to make a broad generalization: most tabular data will have short contents. rather than optimizing dat for spreadsheets where one cell might contain megabytes of data I have decided to instead optimize it for smaller cell values while also respecting disk space usage. this opinion may change in the future!

delimited data is more intensive as you have to scan the full data for all of the instances of your delimiter, but for smaller values the performance impact shouldn't be as noticable. the benefit is that you can store single byte delimiters instead of having to use larger bit precision framing indexes

a nice tradeoff between the two is to use a framed protocol with variable width integers for the indexes. see https://npmjs.org/package/varint and https://npmjs.org/package/multibuffer for more details

