# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## 13.13.0 
* `dat pull --exit=NN` exits after `NN` number of seconds, when there are no updates to sync.

## 13.9.0 - 2017-10-11

### Changed
* Use [datbase.org](https://datbase.org) as default registry (instead of datproject.org)

## 13.8.2 - 2017-09-28

### Fixed
* Error not being handled (https://github.com/datproject/dat/issues/838)
* Set `opts.debug` properly when using `DEBUG` that isn't `dat`.
* Move discovery key to option in `dat keys` (#869)

## 13.8.1 - 2017-08-04

### Fixes
* Error not being handled (https://github.com/datproject/dat/issues/838)

## 13.8.0 - 2017-08-04

With this release, we are adding an exciting feature that really showcases how powerful Dat is, selective sync. Using the CLI you can now specify which files you want to download either with an option or using the `.datdownload` file. `dat sync` will download and keep updated on the selected files. This means you can put large datasets into Dat but have control over what files you download where.

[Full release notes](https://github.com/datproject/dat/releases/tag/v13.8.0)

## Added
* Selective Sync (https://github.com/datproject/dat/pull/834)
* Key management (https://github.com/datproject/dat/pull/828)

## Changed
* Commands run faster via lazy required modules (https://github.com/datproject/dat/pull/821)

## 13.7.0 - 2017-06-28
## Added
* Throttling - sometimes Dat goes too fast, so you can limit the upload + download speeds. (https://github.com/datproject/dat/pull/806)
* Publish metadata to registry when publishing (https://github.com/datproject/dat/pull/812)

## Changed
* Use dat-node http support directly (https://github.com/datproject/dat/pull/817)

## Fixed
* Use npm package for registry testing.

## 13.6.0 - 2017-06-05
Full support for Dat registries! See our [full release notes](https://github.com/datproject/dat/releases/tag/v13.6.0).
### Added
* Improved support for public Dat registries (https://github.com/datproject/dat/pull/794)
* Add unpublish command

## 13.5.1 - 2017-05-30
### Changed
* Big documentation update!
* Force bump dat-node for a deletion bug that was a bit overzealous in deleting files (https://github.com/mafintosh/hyperdrive/issues/167).

## 13.5.0 - 2017-05-25
### Added
* Dat version number is printed in header (https://github.com/datproject/dat/pull/788)
* Add prompt and introduction to `dat create` command (https://github.com/datproject/dat/pull/782) and create dat.json file (https://github.com/datproject/dat/pull/765).
* Tell user if new `.dat` was initialized.
* Add `dat log` command to print archive history and size information (https://github.com/datproject/dat/pull/781).
* Use `require('dat')` to get `dat-node` JS API (https://github.com/datproject/dat/pull/778).

### Changed
* Default to upload true for `dat clone` and `dat pull`, enables better hole-punching (https://github.com/datproject/dat/pull/787).

### Fixed
* Make argument parsing more consistent across commands (https://github.com/datproject/dat/pull/789)
* Fix usage and help text (various).

## 13.4.1 - 2017-05-16
### Added
* Document sparse option in cli help
* add node/dat version to debug

### Changed
* Use share for shortcut (create new dat if not created)

### Fixed
* use exit option on clone shortcut if specified
* [various ui fixes](https://github.com/datproject/dat/pull/764)

## 13.4.0 - 2017-05-11
### Added
* Serve dat over http with `--http` option

## 13.3.0 - 2017-05-10
### Added
* Add `--sources` option for debugging network issues

## 13.2.0 - 2017-05-10
### Added
* Dat-* extensions ([#740](https://github.com/datproject/dat/pull/740))
* Ignore directories in import (dat-node v3.3.0)

## 13.1.1 - 2017-05-10
### Fixed
* Set directory for publish command

### Changed
* Improve `--show-key` help output
* Always show download progress bar and make language more clear.

## 13.1.0 - 2017-05-09
### Fixed
* Cleanup dat <link> shortcut + directory creation
* Check for any swarm.connecting before doing discovery failure.

### Added
* Check node version, fail for anything older than node v4 (#669)
* Add show-key option to display key on downloading cmds
* `dat status` command to show key, file count, dir size, and archive version

## 13.0.0 - 2017-05-08
### Changed
* Upgrade to Hyperdrive v8/9 (SLEEP archive format) and Dat-node v2/3. See [dat-node release docs](https://github.com/datproject/dat-node/releases/tag/v2.0.0) for more info.
* UI updates

## 12.0.3 - 2017-03-29
### Fixed
* Content progress for archives with history
* Change `process.title` to `dat` from `dat-next`

### Changed
* Use two decimals for content progress

## 12.0.2 - 2017-02-08
### Fixed
* Remove `hyperdrive-import-files` from dependencies (it is a dependency of `dat-node`). It was accidentally added.
* Always verify on read to avoid replication errors.

## 12.0.1 - 2017-02-07
### Fixed
* Files getting truncated and edited with bad characters - issue [#626](https://github.com/datproject/dat/issues/626) and [#623](https://github.com/datproject/dat/issues/623)
* Source files getting overwritten (issue [#628](https://github.com/datproject/dat/issues/628))
* Duplicate files getting imported

## 12.0.0 - 2017-02-06
Big new release! See the [release notes](https://github.com/datproject/dat/releases/tag/v12.0.0) on Github.

## 11.6.0 - 2016-11-16
### Removed
* webrtc support

### Fixed
* Fail gracefully if another dat is running in directory
* Handle `dat.open` errors
* Progress bar incorrectly showing 100% complete and 0 bytes

### Added
* Use graceful-fs to avoid EMFILE errors

## 11.5.5 - 2016-11-07
### Fixed
* Better download statistics using blocks instead of bytes
* Fix share stats on resuming without file changes
* Fix calculating size UI for large files

### Changed
* Update status logger. Uses [ansi-diff-stream](https://github.com/mafintosh/ansi-diff-stream) for updating CLI output now.

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
