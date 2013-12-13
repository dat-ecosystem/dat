// tests various ways of creating multibuffers w/ and w/o leading empty bytes

var multibuffer = require('multibuffer')
var varint = require('varint')

var vals = ['foo', 'bar', 'fofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofofo', 'bebebebebebe', 'bebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebebe']
vals = vals.map(function(v) { return new Buffer(v) })

var vi = varint.encode(25)

var num = process.argv[2] || 100000

// warmup
for (var i = 0; i < num; i++) multibuffer.pack(vals)

console.time('just pack')
for (var i = 0; i < num; i++) multibuffer.pack(vals)
console.timeEnd('just pack')

console.time('pack w/ extra')
for (var i = 0; i < num; i++) multibuffer.pack(vals, vi.length)
console.timeEnd('pack w/ extra')

console.time('pack and append')
for (var i = 0; i < num; i++) Buffer.concat([new Buffer(vi.length), multibuffer.pack(vals)])
console.timeEnd('pack and append')
