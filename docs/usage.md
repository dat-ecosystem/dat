
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
Initializing Dat in my_data/
[DONE] readme.txt (0.30 kB)
[DONE] data.csv (1.14 kB)
Items: 2  Size: 1.44 kB
Share Link 4f36c088e9687ddf53d36f785ab84c65f4d24d8c4161950519b96a57d65ae08a
The Share Link is secret and only those you share it with will be able to get the files
Sharing /Users/joe, connected to 2/4 sources
Uploading 28.62 kB/s, 765.08 kB Total
```

You are now publishing that data from your computer. It will be publicly accessible as long as your terminal is open. The hash is a **secret hash**, your data is visible to anyone you send the hash to. As you add more files to the folder, dat will update and share the new files.

### Downloading Files

You can download data by typing `dat <dat-link> <directory>`:

```
$ dat 2bede435504c9482910b5d4e324e995a9bc4d6f068b98ae03d97e8d3ac5f80ea download_dir
Initializing Dat from 52d08a6d1ddc9b1f61b9862d2ae0d991676d489274bff6c5ebebecbfa3239f51
[DONE] readme.txt (0.30 kB)
[DONE] data.csv (1.14 kB)
[DONE] 2 items (1.44 kB)
Share Link 52d08a6d1ddc9b1f61b9862d2ae0d991676d489274bff6c5ebebecbfa3239f51
The Share Link is secret and only those you share it with will be able to get the files
Syncing live updates, connected to 1/2 sources
Download Finished, you may exit process
```

It will start downloading the data into the `download_dir` folder. Anyone who gets access to the unique dat-link will be able to download and re-host a copy of the data. It's distributed mad science!

## Live Sync & Snapshots

Dat makes it easy to share a folder and send files as they are added to the folder. By default, when you share using `dat my_data/` you will be in live sync mode. Anyone connected to you will receive new files.

A snapshot reads the files and creates a specific link that will never change (as long as the files don't change). To create a snapshot use the snapshot option: `dat my_data/ --snapshot`. Snapshots are automatically created for you in live mode.

When downloading a Dat, you do not have to worry about live mode. It will automatically start in the right mode based on the link. 
