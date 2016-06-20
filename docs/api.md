

# Dat CLI Commands & Options

1. Share: `dat <directory>`
2. Download: `dat <dat-link> <directory>`

## Sharing

`dat <directory>`

Share directory in live mode.

#### Share Options

`dat <directory> --snapshot`

Share a snapshot of the current files. 

`dat <directory> --port=1234`

Set your inbound TCP port. This is useful for debugging or on restrictive networks. 

## Downloading

`dat <dat-link> <directory>`

Download files from a dat-link into a local directory. 

### Download Options

`dat <dat-link> <directory> --exit` 

After files are done downloading, exit the process. If you are connected to a live Dat you will not get new files unless you run the command again.

`dat <dat-link> <directory> --port=1234`

Set your inbound TCP port. This is useful for debugging or on restrictive networks. 

## General Options

* `dat --version`: get the version of dat you are running.
* `dat --doctor`: visit the doctor to help identify connectivity issues.
* `dat --quiet`: output only dat-link, no progress information
* `dat --debug`: show debugging output

# Local Storage

When you run a command, Dat creates a hidden folder, `.dat`, in the directory specified. Similar to git, this folder stores information about that Dat. File metadata and the dat-link are stored to make it easy to resume sharing or downloading the same directory.

If you have trouble sharing/downloading in a directory with a `.dat` folder, try deleting it (and let us know what the problem was).
