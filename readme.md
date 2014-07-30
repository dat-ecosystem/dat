# dat

[![NPM](https://nodei.co/npm/dat.png?global=true)](https://nodei.co/npm/dat/)

Windows        | Mac/Linux   
-------------- | ------------
[![Build status](https://ci.appveyor.com/api/projects/status/s236036xnglo4v5l)](https://ci.appveyor.com/project/maxogden/dat) | [![Travis](http://img.shields.io/travis/maxogden/dat.svg?style=flat)](https://travis-ci.org/maxogden/dat)

## Getting started

`dat` is currently **pre-alpha**. You can test it out or hack on it now, but all things are subject to change.

**You should only use dat now if you are okay with the dat API breaking in the future!**

We are working towards a stable release. [Follow progress here](https://github.com/maxogden/dat/issues/29).

If you are interested in testing out the pre-alpha version of `dat` you can install it using `npm` (which usually gets installed when you [install `node`](http://nodejs.org/))

`dat` is primarily intended as a command line tool. There is also a programmatic API that you can use in node.js programs for more advanced use cases, as well as a way to have `dat` call programs written in other programming languages to transform data.

* For high-level description read [what is `dat`?](docs/what-is-dat.md).
* Read the [data importing guide](docs/importing.md)
* Check out the [JS API docs](docs/js-api.md) or the [CLI usage docs](docs/usage.md).
* Curious about how we built dat? Read about the node [modules we used](docs/modules.md)

## Install

To get the currently published version (recommended):

```
npm install dat -g
```

The `-g` means "install globally" which makes the `dat` command available in your command line path.

You can also install the latest development version with `git`:

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
