# dat
From a variety of contributors.

http://dat-data.com

http://github.com/maxogden/dat


## Abstract

The broad adoption of computers in scientific research has made it possible to study phenomenon at an unprecedented scale. Researchers are now able to store and analyze disparate datasets that would have otherwise been impossible or very time-consuming to collect. Scientific peers, however, often have difficulty accessing the source data used during the scientific process. In this paper, we outline the user interface and architecture for Dat, a version-controlled, distributed data tool designed to improve collaboration between data systems and the people who use them. The design decisions described in this article are motivated by real-world use cases developed in collaboration with colleagues in the scientific community. This serves as a living document to help data scientists and developers understand use cases and extend the core technology.

## 1. Introduction

dat is designed to provide data scientists with a common data exchange mechanism to ensure validity in data. Often, data must undergo the painful process of "munging," where the heterogeneity of various sources are integrated together to form source dataset(s). For example, studies that use sensor measurements often depend on a variety of devices and measurements that emit different kinds of data. These sensors will persistently gather data in large quantities, which is cleaned, converted into a format amenable to the researcher's workflow, and transformed for analysis. Teams of researchers do substantial work to build a collaborative workflow that ensures accurate data for publishing. Although data collection and storage across all scientific disciplines as increased, reproducibility of computational analysis still remains primiative.

With increasing interconnectedness and complexity, it is often difficult to keep track of forks in the datastream. In other words, analyses that result in significant, irreconciliable changes to the data increase heterogeneity of source data, and thus headache, for an organized researcher. A substainable and scalable collaborative workflow, also known as a data pipeline, is built for this kind of work, which domain experts usually find difficult, expensive, and time-consuming to build. This means that data-intensive research is often limited to those with the necessary computational skills, personal and professional connections, or institutional resources to build and maintain a complex data pipelining system, which is often internal and not open to the public. This *data divide* explicitly "demarcates research 'insiders' and 'outsiders'... undermin[ing] the research community" [1]. If those who have access to internal tools are the only ones able able to reproduce scientific discoveries, the scientific process is broken.

To close the data divide, we must build tools that allow researchers to be able to focus more on scientific discovery and less on integrating disparate data. We introduce Dat, a version, controlled distributed database and data tool that has user interface of a version control system. Key features of dat include the ability to *track changes* in tabular and binary formats; *supply access points* across peer-to-peer internal and public networks; *create historical checkpoints* with metadata; *replicate* quickly at a given checkpoint; and *encourage forking* of data streams.

## 2. Related Work

There are a variety of ad-hoc systems that can enable the types of interactions that dat is designed to support, but they are often custom-built and siloed in industry or highly-resourced research labs. Kafka may be the closest analogous database, designed by LinkedIn in 2011 for distributed message processing for enterprise logs, such as clickstream or activity feed data [2]. Like Kafka, dat is well-suited for storing and transfering large amounts of log data that is immutable and streaming. However, Kafka lacks key interface design for collabration across teams of varing computational expertise. By contrast, we designed dat to be used easily by data scientists of varying skillsets. We also designed it to work well with git, integrating data and code versioning under a single repository.

We also wanted to build a system that could easily support transfering data over common protocols, like http and ssh for easy distribution of public data. For example, those who sit at the nexus of software development and data production -- librarians, scientists, government agencies, etc. -- have started using online portals like Socrata [3], Harvard's dataverse [4], figshare [5], and others for distributing datasets. However, these data distribution methods post raw data as read-only, never taking contributions. Furthermore, these data portals do not support versioning tabular and binary data, a key component of reproducibility at different points in the original analysis. Finally, version control enables the data get better as more people interact it, because it enables collaboration between data producers, data engineers, data mangers, and data scientists.

There have been many well thought-out attempts at version controlled data; however, most of these tools were designed to work best with the developer's main workstation -- a text file.  For those accustomed to a Git-based development model, it is natural to want to extend that model to data. However, because Git was designed to track changes to relatively small text files, many datasets are much too big to distribute with Git. Two years ago, Facebook created a test Git repository to explore its limits, and found that at 1.3 million files with 15 GB of data, Git takes upwards of 40 minutes to respond to a simple command. To fix this, Git released a new extension called the 'Git Large File Storage (LFS)' in 2015 [6]. Git-Annex [7] is another tool written in Haskell that is used to fix this performance problem with Git. Unfortunately, these extensions focus on binary or text-based data, and are not designed well for data science use cases, which often are log-like, streaming, tabular, or relational. While Git has revolutionized the way that open source code is written for the software development world, workflows around collaborating on data in the research world still remain primitive.

## 3. Design of dat

### 3.1 Importing Datasets
All data is compressed and stored in the hidden `.dat` folder on disk. Values can be defined as binary (i.e., protobufs via `write`) or tabular (csv, tsv, newline-delimited json formats via `import`).

When data is imported into dat, it must be put into a dataset. Each dataset is compartamentalized so that tabular datasets with different schemas can be stored in the same repository without collision. In other words, rows define the schema for a given dataset, and there can be multiple datasets in a single dat. To support bifurcated schemas, we encourage users to create multiple datasets, so that each schema will be independent. A dataset is analogous to a sql table or a nosql collection, however we chose not to use the language of 'table' or 'collection' because dat datasets do not support robust querying at this time.

In Figure 1, we create a new dataset called 'flights' and import some tabular data. To update data later, we must provide a key that identifies each row in the dataset. For example, in this example, the `flightId` column is a unique identifier for each row. Dat will autogenerate keys if the user supplies `--key=false` upon import.

**Figure 1**
```
$ cat flights.json
flightId, airline, date
12381723, Luftansa, "Mar 21 2002"
...

$ dat import flights.json --dataset=flights --key=flightId
Added 302,143 keys (32.03 Mb, 4.4 Mb/s).
Data imported successfully.
Current version is now 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517
```

Blob data can be written just like tabular data using `dat write`. Blob data and tabular data are kept separate inside of each dataset -- tabular data is written to leveldb while binary data is written to a content addressable blob object store. Each of these are attached modularly and can be exchanged for alternative backends, such as S3, SQL-variants, and others. More on how this is implemented in Section 5.

### 3.2 Versioning

When dat begins writing to disk, a new `version` is created -- a uniquely identifiable 64-bit hash that represents the changes that were made during the operation. As each write or import operation is performed, dat creates a new version hash that identifies the entire dat, not just the dataset that was changed.

[img](images/import.png)

Human-readable messages can also be attached to a new version. A user can perform a `dat log` to get access to the history of the dat.

```
$ dat log
Version: 6bdd624ae6f9ddb96069e04fc030c6e964e77ac7 [+12, -0]
Date:    April 15th 2015, 7:30PM PST

  Added new cities dataset.

Version: 7b13de1bd942a0cbfc2721d9e0b9a4fa5a076517 [+302,143, -0]
Date:   April 15th, 2015, 7:29PM PST
```

To go back in time, a user can `dat checkout` for a non-destructive rollback to a version in the past. Data is never deleted from dat -- only different views of the data are made accessible given a particular version.

[img](images/checkout.png)

### 3.3 Replication

A user can replicate data from another user using typical transport protocols such as http or ssh. Dat is transport agnostic, which is well suited for deployment on various kinds of systems.

[img](images/pull.png)

When the repository is pulled from another user, all metadata and changes are replicated exactly as they appear on the peer's disk. Versions can be referenced by each user similarly,

### 3.4: One thousand forks when all you need is a knife isn't really irony

After checking out a dataset to a previous point in the past, a user can add more data. Unlike when data is added to the latest version, adding to a version that is not the latest creates a new fork in the dataset.

[img](images/fork.png)

Although forks could be represented as conflicts to be merged later, as one might expect in a version control system such as Git, dat's philosophy is the opposite. Dat gives power to users to control and manage forks. In software development, merges are encouraged as all roads ideally lead to a working piece of software. Data, on the other hand, embraces forks as a key tool for experimentation during the data munging and analysis process.

Forks can be merged using the commandline. The `dat merge <version>` operation accepts a stream of resolved values in the same format they are emitted in `dat diff`. See the dat repository for more examples on merging.

## 4. Ecosystem

### Client libraries

### Pipelines

## 5. Architecture

We architected dat as a variety of open source modules that build upon and integrate with each other, encouraging contribution from an existing community of data engineers. See the full list of modules used in the [packages.json]()

### 5.1 It's a stream!

All data in dat is read and written as **streams**. That means that a computer running dat does not have to hold the entire dataset, or even an entire row, in memory at any one time. There are significant advantages to this method over popular solutions like Git.

  1. Large data replications can be stopped at any time without corrupting on-disk representation of the data. This is ideal for looking at small subsets of data quickly before retrieving a potentially large dataset.

  2. Streaming real-time data can be connected to a dat endpoint, allowing for evented pipeline I/O between hetergenous components.

  3. Data can be retrieved in pieces, allowing replication support from bittorent swarms.

### 5.2  It's a log!

All data in dat is immutable. That means that all data is treated like a log of a particular event, and only the view of the data overwritten when new data is added.

### 5.3 It's a Graph!

Whatever you write is appended to the graph as a new node. Each node knows which version it came from, i.e., its parent node.

```
a (key: foo, value: bar) (create new layer, layer-id => graph-node-id (version-id))
|
b (key: baz, value: foo) (lookup a's layer, if head insert in that layer, if not head create new layer)
|
c (key: foo, value: baz) (...)
```

A layer is an internal representation of a kind of fork in a dat. A new layer is created in one of two ways. The first is when a new dataset is created. The second is when new data is imported as a child node, and the parent is not the head of the graph -- in other words, when new data is added to a historical checkout of an existing dataset.

```
a
|
b
| \
c  d (create new layer, inherit from layer a (checkout at b))
```

This is the scenario of the fork.

## 6. Performance

### Benchmarks
Here we should list some basic benchmarks (adding data locally, replication, exporting data).

### Room for improvement
Here we should talk about where there might be room for improvement.

## 6. Conclusion and Final Remarks
We hope data tools like dat will be key in the evolution towards data pipelines that are open, thus more accessible; documented, thus more reproducible; and challengeable, thus more correct.

# Bibliography
  1. Boyd, Danah, and Kate Crawford. "Critical questions for big data: Provocations for a cultural, technological, and scholarly phenomenon." Information, communication & society 15.5 (2012): 662-679.
  2. Kreps, Jay, Neha Narkhede, and Jun Rao. "Kafka: A distributed messaging system for log processing." Proceedings of 6th International Workshop on Networking Meets Databases (NetDB), Athens, Greece. 2011.
  3. John S. Erickson, Amar Viswanathan, Joshua Shinavier, Yongmei Shi, James A. Hendler, "Open Government Data: A Data Analytics Approach," IEEE Intelligent Systems, vol. 28, no. 5, pp. 19-23, Sept.-Oct., 2013
  4. King, Gary. "An introduction to the Dataverse Network as an infrastructure for data sharing." Sociological Methods & Research 36.2 (2007): 173-199.
  5. Figshare. Accessed June 1, 2015. <http://figshare.com/>
  6. Github. Git Large File Storage System. Accessed June 1, 2015. <https://github.com/blog/1986-announcing-git-large-file-storage-lfs>
  7. Lührig, Jan Philipp. "File synchroniszation using git-annex assistant." 2013. https://media.itm.uni-luebeck.de/teaching/ws2013/sem-cloud-computing/File_synchronization_using_git-annex_assistant.pdf