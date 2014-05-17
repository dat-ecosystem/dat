var protobuf = require('protocol-buffers');

var Schema = function(storage, onReady) {
	if (!(this instanceof Schema)) return new Schema(storage, onReady)
	this._storage = storage
	this.protobuf = null
	this.update(onReady)
}

Schema.prototype.update = function(cb) {
	var self = this
	this._storage.getMeta('schema', {valueEncoding:'json'}, function(err, schema) {
		if (err && err.notFound) err = null // grrrrr
		if (err) return cb(err)

		self.protobuf = protobuf(schema || [], {
			ignore: ['id', 'change', 'version', 'deleted']
		})

		cb()
	});
}

Schema.prototype.save = function(cb) {
	this._storage.setMeta('schema', this.protobuf.toJSON(), {valueEncoding:'json'}, cb)
}

Schema.prototype.normalize = function(cols) {
	for (var i = 0; i < cols.length; i++) {
		if (typeof cols[i] === 'string') cols[i] = {name:cols[i], type:'string'}
	}
	return cols
}

Schema.prototype.encode = function(doc) {
	return this.protobuf.encode(doc)
}

Schema.prototype.decode = function(buf) {
	return this.protobuf.decode(buf)
}

Schema.prototype.validate = function(doc) {
	return this.protobuf.validate(doc)
}

var mismatch = function() {
	var err = new Error('Column mismatch')
	err.type = 'columnMismatch'
	return err
}

Schema.prototype.mergeFromObject = function(obj, cb) {
	var status = this.protobuf.mergeFromObject(obj)
	if (status === -1) return cb(mismatch())
	if (!status) return cb()
	this.save(cb)
}

Schema.prototype.merge = function(cols, opts, cb) {
	if (typeof opts === 'function') {
		cb = opts
		opts = null
	}

	var status = this.protobuf.merge(cols, opts)
	if (status === -1) return cb(mismatch())
	if (!status) return cb()
	this.save(cb)
}

Schema.prototype.toJSON = function() {
	return this.protobuf.toJSON()
}

module.exports = Schema