# dat

## collaborative data

### What is `dat`?

`dat` is a new initiative funded by the Knight Foundation that seeks to increase the traction of the open data movement by providing better tools for collaboration. 

To illustrate the goals of `dat` consider the GitHub project, which is a great model of this idea working in a different space. GitHub is built on top of an open source tool called `git` and provides a user-friendly web application that lets software developers find code written by others, use it in their own programs and improve upon it. In a similar fashion `dat` will be developed as a set of tools to store, synchronize, manipulate and collaborate in a decentralized fashion on sets of data, hopefully enabling platforms analogous to GitHub to be built on top of it.

The initial prototype of `dat` will be developed as a collection of open source projects in Summer and Fall 2013 by Max Ogden and other open source contributors.

### Why do `dat`?

Open data is a relatively new concept that is being actively supported by both United States President Barack Obama and Internet creator Tim Berners-Lee. The goal is to get those who possess data that could be useful to others to make that data publicly available. The way this is done today by making data available as read-only: you can download bulk copies of data or query a REST API but there is no standard way to share any changes you make to the data. `dat` seeks to take this idea further and enable a decentralized workflow where anyone can track the changes they make to data after they consume it.

#### Example current situation

Here's a concrete example: A police department in a city hosts an Excel spreadsheet on their web server called `Crime-2013.xls`. It contains all of the reported crime so far this year and gets updated every night at midnight with all of the new crimes that were reported each day.

Say you wanted to write a web application that showed all of the crime on a map. To download the new data every night you'd have to write a custom program that downloads the `.xls` file every night at midnight and imports it into your application's MySQL database.

To get the fresh data imported you can simply delete your entire local crime database and re-import all rows from the new .xls file, a process known as a 'kill and fill'.

But the kill and fill method isn't very robust, for a variety of messy reasons. For instance, what if you cleaned up some of the rows in the crime data in your local database after importing it last time? Your edits would get lost.

Another option is a manual merge, where you try and import each and every row of the incoming Excel file one at a time. If the data in the row already exists in the database, skip it. If the row already exists but the incoming data is a new version, overwrite that row. If the row doesn't exist yet make a whole new row in the database.

The manual merge can be tricky to implement. In your import script you will have to write the logic for how to check if an incoming row already exists in your database. Does the Excel file have it's own Crime IDs that you can use to look up existing records, or are you searching for the existing record by other method? Do you assume that the incoming row should completely overwrite the existing row, or do you try to do a full row merge?

At this point the import script is probably a few dozen lines and is very specific to both the Oakland police departments data as well as your application's database. If you decide to switch from MySQL to PostgreSQL in the future you will have to revisit this script and re-write major parts of it.

If you have to do things like clean up formatting errors in the Police data, reproject geographic coordinates, or change the data in other ways there is no straightforward way to share those changes publicly. The best case scenario is that you put your import script on GitHub and name it something like 'City-Police-Crime-MySQL-Import' so that other developers that want to consume the crime data in your city won't have to go through all the work that you just went through.

Sadly, this workflow is the state of the art. Open data tools are at a level comparable to source code management before version control.

#### How `dat` works

`dat` can be described using two simple concepts: **sync** and **transform**.

### Synchronization

In order to enable collaboration on datasets, the first step is to define a syncrhonization protocol for tabular data (tabular data meaning data in a table, like a CSV or an Excel file).

One of the only data stores that does this well is CouchDB. Here is a simplfied breakdown of how Couch does sync:

Every database is made up of two tables. One holds the data, the other contains the chronological history of all operations. Whenever a row is written, edited or deleted from a table a row is added to the history table that describes the change.

If you created a row with data `{"id": "1", "hello": "world"}`, Couch would store a record in the history table that looked like `{"sequence": "1", "id": "1", "action": "created"}`. If you then delete document 1, Couch would store a new entry in the history table: `{"sequence": "2", "id": "1", "action": "deleted"}`. `sequence` refers to the chronological order e.g. the operation number for this particular change in the entire sequence of operations.

Some databases only have one table per database. If you create a row and then later delete it, the database has no way of remembering what documents used to be there. For certain use cases this is okay, but for synchronization this is unacceptable.

The point of the history table is to be able to efficiently answer the query `Yesterday at 12:30PM I pulled all of the data from you, what are all of the changes since then?`. Without the history table every row in the entire database would have to be checked against every row in the requesters database -- a heinously slow operation known as a full table scan.

`dat` will provide a pluggable API for synchronization so that plugins can be written to export and import remote data efficiently from existing databases.

### Transformations

Tabular data and source code are fundamentally different, so they require a different set of tools. `git` has a concept of diffs and patches that describe changes to text like additions, moves and deletions. This concept also exists in the data world with CRUD actions (create, read, update and delete).

For source code, diffs are all you need. For data they are only half of the solution. Diffs can't operate on streams of incoming or outgoing data, for that you need something else: a transform.

** work in progress **