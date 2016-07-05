
***Please note we are actively seeking feedback & developing this 1.0 release candidate (formally RC2).***

## Installation

To install the 1.0 release candidate from npm:

```
npm install -g dat
```

If you receive an `EACCES` error read [this guide](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

## Using Dat

Dat makes it simple to share files or data across many computers. Dat commands are always `dat <source> <destination>. The source can be files on your computer or files shared via a dat-link. 

Dat RC2 has two default commands:

1. `dat <directory>` will share a directory to a dat-link. 
2. `dat <dat-link> <directory>` will download a dat-link to a directory. 

### Sharing Files

Share a directory by typing `dat <directory>`:

```
$ dat my_data/
Sharing /Users/joe/my_data

Share Link: 34p3ak4jwnfn6og184k4tqojngo76qj0nqbat2h03miu85x61t
The Share Link is secret and only those you share it with will be able to get the files

[==============>] Added 21 files (448.41 MB/448.41 MB)

Connected to 2 peers. Uploading 5 mBd/s. Watching for updates...
```

You are now publishing that data from your computer. It will be publicly accessible as long as your terminal is open. The hash is a **secret hash**, your data is visible to anyone you send the hash to. As you add more files to the folder, dat will update and share the new files.

### Downloading Files

You can download data by typing `dat <dat-link> <directory>`:

```
$ dat 34p3ak4jwnfn6og184k4tqojngo76qj0nqbat2h03miu85x61t download_dir
Downloading in /Users/joe/Downloads/download_dir

Share Link: 34p3ak4jwnfn6og184k4tqojngo76qj0nqbat2h03miu85x61t
The Share Link is secret and only those you share it with will be able to get the files

[===>          ] Downloading 180 files (79.01 kB/498.4 MB)

Connected to 0 peers. Downloading 10 mB/s. Watching for updates...
```

It will start downloading the data into the `download_dir` folder. Anyone who gets access to the unique dat-link will be able to download and re-host a copy of the data. It's distributed mad science!

## Live Sync & Snapshots

Dat makes it easy to share a folder and send files as they are added to the folder. By default, when you share using `dat my_data/` you will be in live sync mode. Anyone connected to you will receive new files.

A snapshot reads the files and creates a specific link that will never change (as long as the files don't change). To create a snapshot use the snapshot option: `dat my_data/ --snapshot`. Snapshots are automatically created for you in live mode.

When downloading a Dat, you do not have to worry about live mode. It will automatically start in the right mode based on the link. 
