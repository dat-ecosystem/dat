# Getting started with dat

## About dat

`dat` is primarily intended as a command line tool. There is also a programmatic API that you can use in node.js programs for more advanced use cases.

The `dat` module is designed with a small-core philosophy. It defines an API for reading, writing and syncing datasets. It's written using Node and [a variety of modules](https://github.com/maxogden/dat/blob/master/docs/modules.md).

* For high-level description read [what is `dat`?](https://github.com/maxogden/dat/blob/master/docs/what-is-dat.md)
* Are you a coder? Pick your favorite database/API/file format and try to hook it up to dat. Check out our [data importing guide](https://github.com/maxogden/dat/blob/master/docs/importing.md) to learn how
* We also have a [module wishlist](https://github.com/datproject/discussions/issues/5) in case you are looking for a module to hack on
* Check out the [JS API docs](https://github.com/maxogden/dat/blob/master/docs/js-api.md) or the [CLI usage docs](https://github.com/maxogden/dat/blob/master/docs/cli-usage.md)
* Curious about how we built dat? Read about the node [modules we used](https://github.com/maxogden/dat/blob/master/docs/modules.md)
* Interested in contributing to dat core? Start by checking out our [help wanted issue](https://github.com/maxogden/dat/labels/help%20wanted)
* Want to ask questions in IRC? Join `#dat` on freenode. Chat logs are [available here](https://botbot.me/freenode/dat/)
* Watch the `dat` repo on Github or follow [@dat_project](https://twitter.com/dat_project) on twitter
* Suggest an organization that should be using `dat` to distribute their data. Let us know [on Twitter](http://twitter.com/dat_project)
* Have any other questions/concerns? [Open an issue](https://github.com/maxogden/dat/issues)

## The dat APIs

There are three main interfaces to dat:

- [command line](https://github.com/maxogden/dat/blob/master/docs/cli-usage.md)
- [REST API](https://github.com/maxogden/dat/blob/master/docs/rest-api.md)
- [JavaScript API](https://github.com/maxogden/dat/blob/master/docs/js-api.md)

In addition to the JS API documentation linked above we also [wrote a guide that shows examples](https://github.com/maxogden/dat/blob/master/docs/using-dat-from-node.md) of how to use the dat JS API from Node.

Internally dat has two kinds of data storage: tabular and blob. The default tabular data store is [LevelDB](http://leveldb.org) and the default blob store stores files on the [local filesystem](https://github.com/mafintosh/fs-blob-store). Both of these default backends can be swapped out for other backends.

To learn about how replication works in detail check out [our replication guide](https://github.com/maxogden/dat/blob/master/docs/replication.md).

## Using dat with gasket

To help build data pipelines with dat we have a complementary tool called [gasket](https://github.com/datproject/gasket).

The best way to learn about gasket is to do the [data-plumber](https://www.npmjs.org/package/data-plumber) workshop.
