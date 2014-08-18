# How dat replication works

Everything in dat gets tracked with a version number, and old versions are persisted and replicated. Dat exposes push and pull replication to synchronize state to and from your local table and blob stores. Our replication in inspired by CouchDB but at the moment is much more naive and simple.

Note: At the moment our replication is quite naive and is only useful in master-replica use cases (e.g. doing relatively simple `dat clone` and `dat pull` operations). For the dat beta release we are working on an improved replication system that enables more decentralized workflows with multiple remotes.

When a row of data in the dat table store gets edited we actually store multiple things:

- the tabular data itself goes into leveldb
- we make a new a new entry in an append-only log index in leveldb of all changes that have been made to the dat store since it was created
- if a blob is being attached to a row we store the blob metadata in the row and the blob data itself in the blob store

During a `dat clone` we simply walk the changes feed from the beginning and stream all rows and blobs as a single binary stream from the server to the client (using the [dat-replicator](https://github.com/mafintosh/dat-replicator) module which uses the [dat-replication-protocol](https://github.com/mafintosh/dat-replication-protocol)).

Later when you `dat pull` you only get everything from the remote changes feed that is newer than what you have locally.

## Skim blobs

If you clone in `skim` mode (`dat clone --skim http://foo.com`) only the remote tabular data will be cloned locally. When a blob is requested from a skim replica the blob will be lazily fetched from the original remote and then stored into the local blob store.
