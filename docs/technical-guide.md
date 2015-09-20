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

We use 'user' to refer to a clone of a repository being replicated amongst peers in a distributed system.

When user A writes data, their change is recorded in an append only log, e.g.:

```
userA.put('foo', 'bar')
=> inserts foo = bar into the graph, key is a hash of the change, e.g. cb22b433hf7233
=> appends 'userA-changelog-1 = cb22b433hf7233'
```

Subsequent changes made by userA will be recorded as `userA-changelog-2`, `userA-changelog-3` etc

When userA replicates with userB they can compare changelogs with each other to determine which parts of the graph need to be replicated.

We love logs and recommend reading the book ["I Heart Logs, Event Data, Stream Processing, and Data Integration"](http://shop.oreilly.com/product/0636920034339.do)


## Binary data

Dat can watch the filesystem in its root directory for changes. You add binary files you want to store in dat using `dat write`. Dat uses a content-addressable blob store. Blobs are stored by default in `data.dat/blobs`. See [fs-blob-store](http://github.com/mafintosh/fs-blob-store) for more detail.

## Tabular data

Dat can add data through tables. A dataset in dat is analogous to a sql table or a nosql collection; however, we chose not to use the language of 'table' or 'collection' because Dat datasets do not support robust querying. Tabular data can be indexed and updated by row. Each row has a primary key, which can be specified using the `--key/-k` option during `import`. Each dataset is compartmentalized so that tabular datasets with different schemas can be stored in the same repository without collision.

Tabular data is stored in the leveldb storage as a Protocol Buffer [11], but a user can swap out this storage for any compatible Abstract LevelDOWN storage module. See the [dat-core GitHub repository](http://github.com/maxogden/dat-core) for implementation details.

## Replication

A user can replicate data from another user using typical transport protocols such as http or ssh. When the repository is pulled from another user, all metadata and changes are replicated exactly as they appear on the peer's disk. Versions are transmitted exactly as represented locally over the transport protocol, and the history never changes. This means that once a version is created, it can be referenced to refer to the same data across all peers (unless purged).

## Layers

We perform 'implicit branching' when conflicting edits are made in the graph. This is similar to how union filesystems (AKA copy-on-write) work.

```
a (key: foo, value: cat) (create new layer, layer-id => graph-node-id (version-id))
|
b (key: baz, value: dog) (lookup a's layer, if head insert in that layer, if not head create new layer)
|
c (key: foo, value: horse)
```

```
a
|
b
| \
c  d (create new layer, inherit from layer a (checkout at b))
```

## LevelDB keys

Various indexes on top of the graph to support dat operations

```
{"key":"!data!!changes!eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7!!ak11246285!09","value":"b0c2b798af2a6ebb0b198387b04b3b8c55db63320f940d8d6f9242b49e6443aa!0"}
```

`<layer id> <key> <change number> = <version id> <version index>`

one per key/layer

```
{"key":"!data!!latest!eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7!!ak11246285","value":"b0c2b798af2a6ebb0b198387b04b3b8c55db63320f940d8d6f9242b49e6443aa!0"}
```

`<layer id> <key> = <latest version id> <version index>`

one per key/layer

```
{"key":"!heads!eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7","value":"b0c2b798af2a6ebb0b198387b04b3b8c55db63320f940d8d6f9242b49e6443aa"}
```

`<layer id> = <latest version in layer>`

one per layer

```
{"key":"!layers!27e87a28e43624bc765fe4350f5e31d8546098192318c31357f7d381224065d2","value":"eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7"}
```

`<version id> = <layer id>`

one per version

## Graph keys

managed by hyperlog. totally immutable

`{"key":"!log!!changes!01","value":"eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7"}`

`<change number> = <version id>`

```
{"key":"!log!!heads!b0c2b798af2a6ebb0b198387b04b3b8c55db63320f940d8d6f9242b49e6443aa","value":"b0c2b798af2a6ebb0b198387b04b3b8c55db63320f940d8d6f9242b49e6443aa"}
```

`<head id> (sublevel of all heads, value is irrelevant)`

```
{"key":"!log!!logs!cia8nsrhq0000lkbx8y2hjmfx!01","value":"\b\u0001\u0012@eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7"}
```

`<peer id> <peer change number> = <protobuf with replication stuff>`

## Meta keys

Used by dat for various caching things like dat status

```
{"key":"!meta!changes","value":"9"}
{"key":"!meta!layer","value":"eb4a5151839a71ebffa3f465ef8696e7b5ce4198ea938286aee82eaada403fd7"}
{"key":"!meta!log","value":"/Users/maxogden/Desktop/dat-test/.dat:cia8nsrhq0000lkbx8y2hjmfx"}
```
