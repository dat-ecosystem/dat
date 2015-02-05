# How to contribute

Code changes are welcome and should follow the guidelines below.

* Try to adhere to the prevailing code-style that you're adding to
  * We don't use a linter or have a specific style guide
* Consider moving natural abstractions of your code into their own modules and publish them to [npm](https://www.npmjs.org/)
  * We prefer to remove code from the `dat` module when we can, rather than adding new code
* Add [tests](https://github.com/maxogden/dat/tree/master/test/tests) for your new code if applicable
  * You can run specific tests with `node test/run.js <filename> <testname>`
  * Before making a PR run the complete testsuite with `npm test`
* [Pull requests](http://help.github.com/send-pull-requests/) should be made to the [master branch](https://github.com/maxogden/dat/tree/master).
  * If you are not familiar with the GitHub workflow, the [Git-it workshop](http://jlord.us/git-it/) can help you get started

## Commit messages

We recommend that you add tags based on the content of your commit.

For example, if you are fixing a bug, add 'BUG' to the beginning of your commit message
```
BUG: Slashes at the end of urls were causing 404
```

Features could use the ENH tag, like so:
```
ENH: Can list datasets through the REST api with /datasets
```

Complete list of commit message tags
* ENH: Enhancement
* BUG: Bug
* DOC: Documentation
* REF: Refactor
* TYP: Typo
* STY: Style (code style, e.g., removing whitespace)
* BRK: Breaking change
