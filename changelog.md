# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
*Note: unreleased changes are added here.*

## 11.5.4 - 2016-10-28
### Changed
* Turn off `--watchFiles` by default
* Simplify progress UI

## 11.5.3 - 2016-10-28
### Fixed
* Fix `dat` command with no arguments

## 11.5.2 - 2016-10-24
### Fixed
* Fix `dat --doctor`

## 11.5.1 - 2016-10-24
### Fixed
* Resuming a folder previously shared fixed.

## 11.5.0 - 2016-10-20
### Added
* Accept dat.land links
* Allow `dat <dir>` to resume a downloaded link

### Fixed
* Improved error output for incorrect params

## 11.4.0 - 2016-10-06
### Added
* `--ignore-hidden` option. Ignores hidden files by default.
* `--signalhub` option to override default signalhub URL.

### Fixed
* Remove headless option from electron-webrtc. It is detected for us.
* `utp` is true by default

## 11.3.1 - 2016-09-21
### Fixed
* Use `--quiet` mode with `--debug` so output is easier to read.

## 11.3.0 - 2016-09-18
### Added
* `--webrtc` option. Uses electron-webrtc to run via webrtc.

## 11.2.0 - 2016-09-14
### Added
* `--temp` option. Uses memdb as database instead of `.dat` folder.
* Print message when download finishes telling user they can exit.
* Add option for turning off UTP
* Use dat-js module (includes using hyperdrive-import-files for appending)

### Fixed
* Download finished message not displayed when dat live updates
* Download speed removed when download is finished

## 11.1.2 - 2016-07-18
### Fixed
* Zero bytes total when downloading Dat with single file

## 11.1.1 - 2016-07-15
### Fixed
* Create download directory if doesn't exist
* Accept dat:// links for dat-desktop
* Throw error when two different dats are downloaded to same folder

## 11.1.0 - 2016-07-15
### Fixed
* Use yolowatch module for recursive live updates
* Improved stats for edge cases
* Print link with --quiet argument
* Better stat & progress output with hyperdrive/hypercore events

### Changed
* Simplified and clean up CLI output
* Improve modularity of library
* Move logger module into own npm package, status-logger
* Store key in .dat db without encoding as hex string (#498)
* upgrade to hyperdrive 7

### Removed
* List download option (will be re-added pending a hyperdrive update)

### Added
* Accept dat-encoding for 50 character links

## 11.0.2 - 2016-06-23
### Fixed
* Live mode with recursive adding files!

### Changed
* Separate yoloWatch to module

## 11.0.1 - 2016-06-20
### Fixed
* Create download directory if it doesn't exist

### Added
* Updated Docs

## 11.0.0 - 2016-06-17
### Added
* Live dat by default
* Added the `.dat` folder to store metadata and keys
* Resume dat share and download in existing .dat directory
* Store metadata using leveldb
* --list option on download to list files
* --exit option on download to close process on completion

### Changed
* New proposed RC2 API
* --static option change to --snapshot
* Use Hyperdrive-archive-swarm module for swarm

### Removed
* --seed option, stays open by default now
* --no-color option
* --append option, append by default now

## 10.1.1 - 2016-06-09
### Fixed
* Fix file count on live share
* Fix total percentage on share

## 10.1.0 - 2016-06-08
### Changed
* Show progress in CLI output

## 10.0.2 - 2016-06-07
### Fixed
* Fix --static sharing
* Fix --doctor

## 10.0.1 - 2016-06-06
### Fixed
* Share argument
* Argument bugs

## 10.0.0 - 2016-06-06
### Added
* Live sharing!

### Changed
* Update to hyperdrive 6.0
* Update API to RC2 candidate 

## 9.x.x and earlier

These refer to the pre-1.0 versions of dat and are omitted.
