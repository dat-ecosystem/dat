# Dat: version, fork, and sync datasets

Welcome to Dat!

Key features of Dat include the ability to:

  * **track changes** in tabular and binary formats;
  * **supply access points to data** across peer-to-peer internal and public networks;
  * **create historical checkpoints** with metadata, like a message, timestamp, and author;
  * **sync** across machines with cryptographic accuracy;
  * **encourage forking** of data

If you haven't yet, please swing over to our interactive tutorial to get the basics of dat:

[Interactive tutorial](http://try-dat.com)

## Overview

### Storage

By default, data is compressed and stored in the `data.dat` folder on disk. Values can be defined as binary (i.e., protobufs via `write`) or tabular (csv, tsv, newline-delimited json formats via `import`).

### Datasets

When data is imported into dat, it must be put into a dataset. A dataset is analogous to a sql table or a nosql collection; however, we chose not to use the language of 'table' or 'collection' because Dat datasets do not support robust querying. Each dataset is compartmentalized so that tabular datasets with different schemas can be stored in the same repository without collision. In other words, rows define the schema for a given dataset, and there can be multiple datasets in a single dat.

### Binary data

Blob data can be written just like tabular data using `dat write`. Blob data and tabular data are kept separate -- tabular data is written to leveldb while binary data is written to a content-addressable blob store. Each of these are modular and can be replaced with S3, SQL-variants, and other backends.

### Indexing

Tabular data can be indexed and updated by row. Each row has a primary key, which can be specified using the `--key/-k` option during `import`. Tabular data is stored in the leveldb storage as a Protocol Buffer [11], but a user can swap out this storage for any compatible Abstract LevelDOWN storage module. See more on this in the github repository.

### Forks designed for data

After checking out a dataset to a previous point in the past, a user can still add more data. However, adding to a version that is not the latest creates a new fork in the dataset. Although forks could be represented as conflicts to be merged immediately (as one might expect in a version control system such as Git), Dat's philosophy is the opposite. We think that data tools should embrace forks as key support for experimentation during the scientific process. When a user pulls from a peer, forks will also be pulled so that each user has a complete picture of the graph.

### Replication

A user can replicate data from another user using typical transport protocols such as http or ssh. Dat is transport agnostic, so it is well suited for deployment on various kinds of systems with little IT overhead. When the repository is pulled from another user, all metadata and changes are replicated exactly as they appear on the peer's disk. Versions are transmitted exactly as represented locally over the transport protocol, and the history never changes. This means that once a version is created, it can be referenced to refer to the same data across all peers (unless purged).