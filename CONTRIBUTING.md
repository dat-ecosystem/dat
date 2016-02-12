# Welcome to Dat!

If you are opening an issue because of a bug or technical problem, please provide a simple repeatable test case we can run!

## Submitting pull requests

Before taking the time to code something, feel free to open an issue first proposing your idea to other contributors, that way you can get feedback on the idea before taking time to write precious code.

For any new functionality we like to see unit tests added as well so that we can catch regressions in the future in case something else breaks your fix.

## Development workflow

We use and write a lot of node modules and it introduces a bit of a learning curve when working on multiple modules simultaneously.

### Developing inside a node_modules folder

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
