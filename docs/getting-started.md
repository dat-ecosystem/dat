# Getting started with dat

The `dat` module is designed with a small-core philosophy. It defines an API for reading, writing and syncing datasets. It's written using Node and [a variety of modules](https://github.com/maxogden/dat/blob/master/docs/modules.md).

There are three main interfaces to dat:

- [command line](https://github.com/maxogden/dat/blob/master/docs/cli-usage.md)
- [REST API](https://github.com/maxogden/dat/blob/master/docs/rest-api.md)
- [JavaScript API](https://github.com/maxogden/dat/blob/master/docs/js-api.md)

In addition to the JS API documentation linked above we also [wrote a guide that shows examples](https://github.com/maxogden/dat/blob/master/docs/using-dat-from-node.md) of how to use the dat JS API from Node.

Internally dat has two kinds of data storage: tabular and blob. The default tabular data store is [LevelDB](http://leveldb.org) and the default blob store stores files on the [local filesystem](https://github.com/mafintosh/fs-blob-store). Both of these default backends can be swapped out for other backends.


To learn about how replication works in detail check out [our replication guide](https://github.com/maxogden/dat/blob/master/docs/replication.md).