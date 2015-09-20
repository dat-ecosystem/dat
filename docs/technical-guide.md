# Technical Guide

## Forks designed for data

After checking out a dataset to a previous point in the past, a user can still add more data. However, adding to a version that is not the latest creates a new fork in the dataset. Although forks could be represented as conflicts to be merged immediately (as one might expect in a version control system such as Git), Dat's philosophy is the opposite. We think that data tools should embrace forks as key support for experimentation during the scientific process. When a user pulls from a peer, forks will also be pulled so that each user has a complete picture of the graph.

![img](images/fork.png)

Forks can be merged into a single, new commit to create a new version hash. The `dat merge <version>` operation accepts a stream of resolved values in the same format they are emitted in `dat diff`.

![img](images/merge.png)

## The Graph

Dat is similar to git because they both use a Merkle Directed Acyclic Graph (Merkle DAG) to track history of data. However, git is inefficient because it stores the values of the data in the graph. Dat, on the other hand, separates the graph from the data. In this way, Dat is able to replicate the metadata only to replicate the graph quickly. This also makes Dat more composable with alternative storage formats instead of just the filesystem.

We store mutable data in [leveldown](https://github.com/Level/leveldown), a key/value store with basic iterator support. We store data such that:

- Changes are stored using a technique we call 'layers' to support multiple forks of a dataset
- Each user keeps track of what changes they made, so that when replication happens users can compare their state with the remote user
- Data can be prefixed/namespaced to support multiple datasets in a single repository
- Metadata in the graph is dereferenced from actual data (content addressed), so you can replicate the graph very quickly and choose the appropriate transport for the actual data

## The Log

All data in Dat is effectively immutable. That means that all data is treated like a log of a particular event, and only the view of the data changed when new data is added.

## Binary data

Dat can watch the filesystem in its root directory for changes. You add binary files you want to store in dat using `dat write`. Dat uses a content-addressable blob store. Blobs are stored by default in `data.dat/blobs`. See [fs-blob-store](http://github.com/mafintosh/fs-blob-store) for more detail.

## Tabular data

Dat can add data through tables. A dataset in dat is analogous to a sql table or a nosql collection; however, we chose not to use the language of 'table' or 'collection' because Dat datasets do not support robust querying. Tabular data can be indexed and updated by row. Each row has a primary key, which can be specified using the `--key/-k` option during `import`. Each dataset is compartmentalized so that tabular datasets with different schemas can be stored in the same repository without collision.

Tabular data is stored in the leveldb storage as a Protocol Buffer [11], but a user can swap out this storage for any compatible Abstract LevelDOWN storage module. See the [dat-core GitHub repository](http://github.com/maxogden/dat-core) for implementation details.

## Replication

A user can replicate data from another user using typical transport protocols such as http or ssh. When the repository is pulled from another user, all metadata and changes are replicated exactly as they appear on the peer's disk. Versions are transmitted exactly as represented locally over the transport protocol, and the history never changes. This means that once a version is created, it can be referenced to refer to the same data across all peers (unless purged).
