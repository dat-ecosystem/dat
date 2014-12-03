# How to contribute
We are a community project, where everyone is invited to contribute. 

## Issues

If you have a question or an issue with dat, just post a [new issue](https://github.com/maxogden/dat/issues/new) on GitHub. You can also use this to let us know about your data use cases and feature requests.


You can also always ask questions on the [dat gitter channel](https://gitter.im/datproject/discussions) or on the IRC freenode `#dat` channel.


## Patching Code
Code changes are welcome and should follow the guidelines below. 

* [Fork this repository](https://github.com/maxogden/dat/fork) on GitHub.
  * If you are not familiar with the GitHub workflow, the [Git-it workshop](http://jlord.us/git-it/) can help you get started
* Consider moving natural abstractions of your code into their own modules and publish them to [npm](https://www.npmjs.org/)
* Add [tests](https://github.com/maxogden/dat/tree/master/test/tests) for your new code if applicable
  * You can run specific tests with `node test/run.js <filename> <testname>`
  * Before making a PR run the complete testsuite with `npm test`
* [Pull requests](http://help.github.com/send-pull-requests/) should be made to the [master branch](https://github.com/maxogden/dat/tree/master).