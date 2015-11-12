var protobuf = require('protocol-buffers')
var fs = require('fs')

module.exports = protobuf(fs.readFileSync(__dirname + '/../schema.proto', 'utf-8'))
