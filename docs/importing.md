# Importing data

The main goal of dat is to enable an ecosystem of streaming read/write interfaces between all conceivable data sources.

![diagram](../img/component-diagram.png)

The problem lies in that there are thousands and thousands of different file formats, databases and APIs so there cannot be one generalized approach to sync them all. For this reason dat is designed with a small core philosphy: to only provide enough of a generalized API to synchronize data and to leave the actual use-case specific parsing up to a third party ecosystem.

There are a few different ways to store data in dat, the best one depends on your use case: the type of data, it's update frequency, format, structure, etc.

## Storage options

### Tabular store

### Blob store

### Metadata only ("Indexed mode")

## Module types

### Replicators

### Indexers

### Custom backends
