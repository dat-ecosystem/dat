#**(DRAFT - NOT DONE)**

# Announcing the dat stable alpha 

The first code went into dat a year ago, [on August 17th 2013](https://github.com/maxogden/dat/commit/e5eda57b53f60b05c0c3d97da90c10cd17dcbe19). The first six months were spent making a prototype (thanks to the [Knight foundation Prototype Fund](http://www.knightfoundation.org/grants/201346305/)) and the last six months have been spent on taking dat beyond the prototype phase and into something more concrete, which is what we are shipping today!

In April of this year we were able to expand the team working on dat from 1 person to 3 persons, thanks to [support from the Sloan foundation](http://usodi.org/2014/04/02/dat). Sloan's proposition was that they like the initial dat prototype but wanted to see scientific data use cases be treated as top priority. As a result we expanded the scope of the project from it's tabular data specific beginnings and have focused on adding features that will help us work with larger scientific datasets.

Up until this point the dat API has been in flux as we were constantly iterating on it. From this point forward we will be taking backwards compatibility much more seriously so tha third party developers can feel confident in building on top of dat.

Our overall goal of dat is to make a set of tools for creating and sharing streaming data pipelines, a sort of [ETL](http://en.wikipedia.org/wiki/Extract,_transform,_load) style system but designed from the ground up to be developer friendly, open source and streaming.

## What's in `dat` today

The `dat` module is designed with a small-core philosophy. It defines an API for reading, writing and syncing datasets. It's written using Node and [a variety of modules](https://github.com/maxogden/dat/blob/master/docs/modules.md).

There are three main interfaces to dat:

- [command line](https://github.com/maxogden/dat/blob/master/docs/usage.md)
- [REST API](https://github.com/maxogden/dat/blob/master/docs/rest-api.md)
- [JavaScript API](https://github.com/maxogden/dat/blob/master/docs/js-api.md)

In addition to the JS API documentation linked above we also [wrote a guide that shows examples](https://github.com/maxogden/dat/blob/master/docs/using-dat-from-node.md) of how to use the dat JS API.

Internally dat has two kinds of data storage: tabular and blob. The default tabular data store is [LevelDB](http://leveldb.org) and the default blob store stores files on the [local filesystem](https://github.com/mafintosh/fs-blob-store).

Everything in dat gets tracked with a version number, and old versions are persisted and replicated. Dat exposes push and pull replication to synchronize state to and from your local table and blob stores. At the moment our replication is quite naive and is only useful in master-replica use cases. For the dat beta release we are working on an improved replication system that enables more decentralized workflows.

To learn about how replication works in detail check out [our replication guide](https://github.com/maxogden/dat/blob/master/docs/replication.md).

## How to get involved

### Write a module or 5

There are a lot of modules that we think would be really awesome to have, and [we started a wishlist here](https://github.com/datproject/discussions/issues/5). If you see something you are interested in building, please leave a comment on that thread stating your intent. Similarly, if there is a format or storage backend that you would like to see dat support, leave it in the comments.

### Kick the tires

To help you choose an approach to loading data into dat we have created a [data importing guide](https://github.com/maxogden/dat/blob/master/docs/importing.md).

## Pilot datasets

