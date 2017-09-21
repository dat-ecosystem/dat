# Welcome to Dat!

Please take a second to read over this before opening an issue. Providing complete information upfront will help us address any issue (and ship new features!) faster. Our time is limited, please respect it and create complete issues.

We are available to chat in IRC at #dat. You can join [via Gitter](https://gitter.im/datproject/discussions). You can also [view and search](https://botbot.me/freenode/dat/) chat logs.

We have a [faq](https://docs.datproject.org/faq) section on our docs that may address non-bug questions.

## Opening an Issue

Please read this section before opening a new issue. 

`dat` is composed of many modules and this repository is just one of them. If you know your issue is with another module, we prefer you open it in that repository. There may be an exiting issue in another repository. If you aren't sure, then this is the perfect place.

Any new issues should be *actionable*. If your issue cannot be solved (and thus closed) please reconsider opening it in our discussion repository or rewording it.

### Bug Reports

A perfect bug report would have the following:

1. Summary of the issue you are experiencing.
2. Details on what versions of node and dat you have (`node -v` and `dat -v`).
3. A simple repeatable test case for us to run. Please try to run through it 2-3 times to ensure it is completely repeatable.

We would like to avoid issues that require a follow up questions to identify the bug. These follow ups are difficult to do unless we have a repeatable test case.

We can't all be perfect =). Do as much as you can and we'll try to help you with the rest. If we are slow to respond, a more complete bug report will help.

### Feature Requests

Feature requests are more than welcome. Please search exiting issues (open and closed) to make sure it is not a duplicate. A good feature request would have examples of how to use it, some detailed use cases, and any concerns or possible edge cases.

Keep in mind we have specific use cases we are building for (namely scientific data sharing). If, your feature request does not fit within that use case it may not be prioritized or implemented.

### General Discussion Issues

We prefer to be able to close issues in this repository, which does not lend itself to discussion type questions. Open discussion type issue in the [datproject/discussions](https://github.com/datproject/discussions/issues) repository.

## For Developers

Please read these guidelines if you are interested in contributing to Dat.

### Submitting pull requests

Before taking the time to code something, feel free to open an issue first proposing your idea to other contributors, that way you can get feedback on the idea before taking time to write precious code.

For any new functionality we like to see:

* unit tests so that we can improve long term maintenance and catch regressions in the future
* updates to the [change log](http://keepachangelog.com/) and relevant documentation

### For Collaborators

Make sure to get a `:thumbsup:`, `+1` or `LGTM` from another collaborator before merging a PR. If you aren't sure if a release should happen, open an issue.

Release process:

- make sure the tests pass
- Update changelog
- `npm version <major|minor|patch>`
- `git push && git push --tags`
- `npm publish`

### Development workflow

We use and write a lot of node modules and it introduces a bit of a learning curve when working on multiple modules simultaneously. There are lots of different and valid solutions to working on lots of modules at once, this is just one way.

#### Developing inside a node_modules folder

First make sure you are comfortable with [how require works](https://github.com/maxogden/art-of-node#how-require-works) in node.

We recommend creating a folder somewhere manually called `node_modules`. For example in `~/code/node_modules`. Clone all of your git copies of modules that you want to work on into here, so for example:

- `~/code/node_modules/dat`
- `~/code/node_modules/hyperdrive`

When you run `npm install` inside of `~/code/node_modules/dat`, dat will get its own copy of `hyperdrive` (one if its dependencies) inside `~/code/node_modules/dat/node_modules`. However, if you encounter a bug in hyperdrive that you need to fix, but you want to test your fix in dat, you want dat to use your git copy of hyperdrive at `~/code/node_modules/hyperdrive` and not the npm copy of hyperdrive at `~/code/node_modules/dat/node_modules/hyperdrive`.

How do you get dat to use the git copy of hyperdrive? Just delete the npm copy!

```
rm -rf ~/code/node_modules/dat/node_modules/hyperdrive
```

Now when you run dat, and it tries to `require('hyperdrive')` it first looks in its own `node_modules` folder at `~/code/node_modules/dat/node_modules` but doesnt find hyperdrive. So it goes up to `~/code/node_modules` and finds `hyperdrive` there and uses that one, your git copy.

If you want to switch back to an npm copy, just run `npm install` inside `~/code/node_modules/dat/` and npm will download any missing modules into `~/code/node_modules/dat/node_modules` but wont touch anything in `~/code/node_modules`.

This might seem a bit complicated at first, but is simple once you get the hang of it. Here are some rules to help you get started:

- Never make any meaningful edits to code inside an "npm-managed" node_modules folder (such as `~/code/node_modules/dat/node_modules`), because when you run `npm install` inside those folders it could inadvertently delete all of your edits when installing an updated copy of a module. This has happened to me many times, so I just always use my git copy and delete the npm copy (as described above) to make edits to a module.
- You should never need to run any npm commands in terminal when at your "manually managed"" node_modules folder at `~/code/node_modules`. Never running npm commands at that folder also prevents npm from accidentally erasing your git copies of modules
- The location of your "manually managed" node_modules folder should be somewhere isolated from your normal require path. E.g. if you put it at `~/node_modules`, then when you run `npm install dat` at `~/Desktop` npm might decide to erase your git copy of dat at `~/node_modules/dat` and replace it with a copy from npm, which could make you lose work. Putting your manually managed `node_modules` folder in a sub-folder like `~/code` gets it "out of the way" and prevents accidents like that from happening.
