var fs = require('fs')
var chalk = require('chalk')
var latestVersion = require('latest-version')

module.exports = function () {
  latestVersion('dat').then(function (version) {
    fs.writeFile('../.dat-version', version, function (err) {
      if (err) {
        console.error(err)
      }
    })
  })

  if (fs.existsSync('../.dat-version')) {
    var newestVersion = fs.readFileSync('../.dat-version', 'utf8')
    var pkg = require('../package.json')
    if (pkg.version !== newestVersion) {
      console.log(chalk.yellow('warning') + ' your version of Dat is ' +
               'out of date. The latest version is "' +
                newestVersion + '" while you are on "' + pkg.version + '".\n' +
                chalk.cyan('info') + ' To upgrade, run the following command:\n' +
                chalk.gray('$ npm install dat -g '))
    }
  }
}
