# Dat
From a variety of contributors.

http://dat-data.com

http://github.com/maxogden/dat


## Abstract
Dat is a version-controlled, distributed database. Dat is designed to provide data scientists with a common data exchange mechanism to collaborate and share research data, both internally and externally. Here, we outline the core infrastructure for Dat, which has been informed by key use cases in the scientific community. We hope this serves as a living document to help developers and data scientists in all stages of interaction with Dat -- from extending features to understanding use case trade offs.

## Introduction
We hope Dat will simplify enormously the process of duplicating and verifying novel research and associated discoveries. We've been working with scientists to arrive at key use cases that go unsolved across multiple scientific domains with varied technological expertise.

From day one, we architected Dat as a variety of open source modules that build upon and integrate with each other, encouraging contribution from an existing community of data engineers. You can find the current list of modules in the `package.json` of the [main repository](http://github.com/maxogden/dat).

## 2. Data in Dat
### 2.1 Datasets
A dataset in dat is a container for all of the versions of a given table. A dataset is created when data is added to dat, and can be given a name. If no name supplied, dat adds the data to the global, default dataset. Dat accepts data in csv, tsv, or newline-delimited json formats.

```
dat add flights.json -d flights
ba5d123eadf6df2
```

Data is then streamed into the Dat database, one row at a time. That means that your computer does not have to hold the entire dataset in memory to add to Dat. When data is finished being added, a new table is created inside of the dataset. This table is given a unique identifier, that is a `hash`. This `hash` can be used to reference or rollback to the table. Read on how this is implemented in Section 4.

[img]()

### 2.2 Updating data
For Dat to know when new data creates a new row or when  When adding data to a dataset,

Data in dat is immutable. That means that data is never deleted from dat.


### 2.3 Immutability
### 2.4 Streaming

## 3. Ecosystem
### 3.1 Client libraries
### 3.2 Pipelines

## 4. Architecture
For each of the following sections, we should describe how dat's core and its underlying modules support the features listed
### Streaming

## Ecosystem
### Client libraries
### Pipelines

## Architecture
For each of the following sections, we should describe how dat's core and its underlying modules support the features listed.

### It's a Graph
Supports merging
TODO: HOW

Supports branches
TODO: how

### It's a Log
Supports checkout
TODO: HOW

Supports pull
TODO: how

## Performance

### Benchmarks
Here we should list some basic benchmarks (adding data locally, replication, exporting data).

### Room for improvement
Here we should talk about where there might be room for improvement.
