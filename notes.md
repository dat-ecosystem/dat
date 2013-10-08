# random technical notes

## input formats

all are streaming parsers

- line delimited json (default, powered by [ldjson-stream](http://npmjs.org/ldjson-stream) or [binary-split](http://npmjs.org/binary-split))
- .csv (powered by [binary-csv](http://npmjs.org/binary-csv))
- .json (w/ [JSONStream](http://npmjs.org/JSONStream) query syntax)
- .buff ([multibuffer](http://npmjs.org/multibuffer))
- potentially redis protocol, though it may required features we don't need
