# Dat
From a variety of contributors.

http://dat-data.com

http://github.com/maxogden/dat


## Abstract
Dat is a version-controlled, distributed data tool. Dat is designed to provide data scientists with a common data exchange storage and exchange mechanism to collaborate and share research data. Here, we outline the core motivations, user interface design, and infrastructure, that were informed by key use cases in the scientific community. This serves as a living document to help data scientists and developers understand use cases and extend the core technology for wider use.

## 1. Introduction

We’ve reached a time where data collection and analysis on a computer is an integral part of scientific research. An independent researcher should be able to replicate the research of the original author to not only ensure correctness, but also to produce a wide variety of alternative or complementary analyses to a study. In practice, the programs and data produced during the scientific process are very rarely made available to the general public. The source code and data created to produce a paper is often treated like second-class material, and is frequently indecipherable to anyone besides the authors. It is also usually not version controlled over the development and cleaning of the source data, especially if the study involves large data. This can cause a drastically increased workload for collaboration and reproduction.

Another barrier to research is building systems that gather data for a more accurate, broad, or fine-grained picture of the phenomenon in question. This is often rectified in research labs through the painful process of data "munging," where heterogeneity of various components must be integrated together to form source dataset(s). For example, studies that use sensor measurements depend on data that is emitted in different formats at different time intervals. Data from these sensors will often continue to be gathered in large quantities, even after the research is published. A researcher might have to do substantial work to build a system that can integrate, compare, and draft models of this disparate, streaming, real-time data.

With scenarios of increasing interconnectedness and complexity like these, it is often difficult to support use cases such as checkpoints that can be rolled back on request, or one-off analyses that result in forks of the data. Domain experts usually find it difficult, expensive, or time-consuming to build a substaintially scalable data pipeline. In this way, computationally-intensive research and data access is limited to those with the necessary computational skills, personal and professional connections, or institutional resources to build such system. This *data divide* evokes the ethos of danah boyd and Kate Crawford, characteristic of another "digital divide" that explicitly "demarcates research 'insiders' and 'outsiders'... undermin[ing] the research community" [1].

As tools develop that close the data divide, researchers will be able to focus more on scientific discovery and less on integrating disparate data. We hope data tools like Dat will be key in the evolution of research in this direction: towards data pipelines that are open, thus more accessible; documented, thus more reproducible; and challengeable, thus more correct.

## 2. Related Work

There are a variety of ad-hoc systems that can enable the types of interactions that Dat is designed to support, but they are often custom-built and siloed in industry or highly-resourced research labs. Kafka may be the closest analogous database, designed by LinkedIn in 2011 for distributed message processing for enterprise logs, such as clickstream or activity feed data [2]. Like Kafka, Dat is well-suited for storing and transfering large amounts of log data that is immutable and streaming. However, Kafka lacks key interface design for collabration across teams of varing computational expertise. By contrast, we designed dat to be used easily in collaboration with git to integrate data versioning very closely with code versioning.

We also wanted to build a system that could easily support transfering data over common protocols, like http and ssh for easy distribution of public data. For example, those who sit at the nexus of software development and data production -- librarians, scientists, government agencies, etc. -- have started using online portals like Socrata [3], Harvard's dataverse [4], figshare [5], and others for distributing datasets. However, these data distribution methods post raw data as read-only, never taking contributions. Furthermore, these data portals do not support versioning tabular and binary data, a key component of reproducibility at different points in the original analysis. Finally, version control enables the data get better as more people interact it, because it enables collaboration between data producers, data engineers, data mangers, and data scientists.

There have been many well thought-out attempts at version controlled data; however, most of these tools were designed to work best with the developer's main workstation -- a text file.  For those accustomed to a Git-based development model, it is natural to want to extend that model to data. However, because Git was designed to track changes to relatively small text files, many datasets are much too big to distribute with Git. Two years ago, Facebook created a test Git repository to explore its limits, and found that at 1.3 million files with 15 GB of data, Git takes upwards of 40 minutes to respond to a simple command. Git has recently released a new extension called the 'Git Large File Storage (LFS).' [3] Unfortunately, this feature is still focused on only binary or text-based data, not designed for data science use cases, which often deals with log-like, tabular, network, or relational data. While Git has revolutionized the way that open source code is written for the software development world, workflows around sharing data in the research world remain primitive.

## 3. Dat Design Principles

Dat accepts data in key-value pairs. Data can be inserted as binary or tabular (comprised of rows). Tabular data can be parsed from the commandline in csv, tsv, or newline-delimited json formats. Data is compressed and stored in the hidden `.dat` folder.

`dat import`: writes tabular or row-like data
`dat write`: writes binary data



When tabular data is finished being added, a new `table` is created inside of the dataset. This table is given a unique identifier, that is a `version`. This `version` can be used to reference or rollback the dat to that point in time. Read on how this is implemented in Section 4.

### 3.2 Datasets
A dataset in dat is a container for all of the versions of a given table. A dataset is created when data is imported into dat, and is given a unique name. In the following example, we create a new dataset called 'flights'.

```
dat import flights.json --dataset=flights
Added 302,143 keys (32.03 Mb, 4.4 Mb/s).
Data added successfully.
Current version is now b04adb64fdf2203
```

[img]()

### 3.3 Updating data
For Dat to know when new data creates a new row or when  When adding data to a dataset,

Data in dat is immutable. That means that data is never deleted from dat.

### 3.4 It's a stream!

All data in dat is read and written as **streams**. That means that a computer running dat does not have to hold the entire dataset, or even an entire row, in memory at any one time. There are significant advantages to this method over popular solutions like Git.

  1. Large data replications can be stopped at any time without corrupting on-disk representation of the data. This is ideal for looking at small subsets of data quickly before retrieving a potentially large dataset.

  2. Streaming real-time data can be connected to a dat endpoint, allowing for evented pipeline I/O between hetergenous components.

  3. Data can be retrieved in pieces, allowing replication support from bittorent swarms.

### 3.5 All Data is Log Data

All data in dat is immutable. That means that all data is treated like a log of a particular event, and only the view of the data overwritten when new data is added.

```
dat purge
```


## 4. Ecosystem
### Client libraries
### Pipelines

## 5. Architecture

We architected Dat as a variety of open source modules that build upon and integrate with each other, encouraging contribution from an existing community of data engineers.


### 5.1 It's a Graph!

Whatever you write is appended to the graph as a new node. Each node knows which version it came from, i.e., its parent node.

```
a (key: foo, value: bar) (create new layer, layer-id => graph-node-id (version-id))
|
b (key: baz, value: foo) (lookup a's layer, if head insert in that layer, if not head create new layer)
|
c (key: foo, value: baz) (...)
```

```
a
|
b
| \
c  d (create new layer, inherit from layer a (checkout at b))
```

#### checkouts

```
a (key: foo, value: bar) (create new layer, layer-id => graph-node-id (version-id))
|
b (key: baz, value: foo) (lookup a's layer, if head insert in that layer, if not head create new layer)
|
c (key: foo, value: baz) (...)
```

Supports merging

### It's a Log

## 5. Performance

### Benchmarks
Here we should list some basic benchmarks (adding data locally, replication, exporting data).

### Room for improvement
Here we should talk about where there might be room for improvement.

# Bibliography
[1] danah boyd, five critical questions
[2] http://research.microsoft.com/en-us/um/people/srikanth/netdb11/netdb11papers/netdb11-final12.pdf
[3] John S. Erickson, Amar Viswanathan, Joshua Shinavier, Yongmei Shi, James A. Hendler, "Open Government Data: A Data Analytics Approach," IEEE Intelligent Systems, vol. 28, no. 5, pp. 19-23, Sept.-Oct., 2013
[4] King, Gary. "An introduction to the Dataverse Network as an infrastructure for data sharing." Sociological Methods & Research 36.2 (2007): 173-199.
[5] http://figshare.com/
[6] https://github.com/blog/1986-announcing-git-large-file-storage-lfs