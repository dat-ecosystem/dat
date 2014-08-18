# dat

[![NPM](https://nodei.co/npm/dat.png?global=true)](https://nodei.co/npm/dat/)

Windows        | Mac/Linux   
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)

## Getting started

**The Dat Alpha release is out now**. [Read the announcement post here](docs/dat-stable-alpha.md).

`dat` is primarily intended as a command line tool. There is also a programmatic API that you can use in node.js programs for more advanced use cases.

* For high-level description read [what is `dat`?](docs/what-is-dat.md).
* Install and play around with the alpha version of `dat`. Leave feedback in the Github Issues of this repository! Check out our [getting started guide]() to learn how.
* Are you a coder? Pick your favorite database/API/file format and try to hook it up to dat. Check out our [data importing guide](docs/importing.md) to learn how.
* Check out the [JS API docs](docs/js-api.md) or the [CLI usage docs](docs/cli-usage.md).
* Curious about how we built dat? Read about the node [modules we used](docs/modules.md)
* Want to ask questions in IRC? Join `#dat` on freenode. Chat logs are [available here](https://botbot.me/freenode/dat/)

### Get involved with `dat`

* Watch the `dat` repo on Github or follow [@dat_project](https://twitter.com/dat_project) on twitter.
* Suggest an organization that should be using `dat` to distribute their data. Let us know [on Twitter](http://twitter.com/dat_project).
* Have any other questions/concerns? [Open an issue](https://github.com/maxogden/dat/issues).

## Install

You need to node.js version 0.10 or above. We recommend that you install node from the [node website](http://nodejs.org/).

You can check your node version by running `node -v` on the command line.

To get the currently published version (recommended):

```
npm install dat -g
```

The `-g` means "install globally" which makes the `dat` command available in your command line path.

You can also install the latest development version with `git` (experienced users only):

```
git clone git://github.com/maxogden/dat.git
cd dat
npm install
npm link
```

### BSD Licensed

Copyright (c) 2014 Max Ogden and contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
