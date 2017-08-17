var fs = require('fs')
var chalk = require('chalk')
var npmview = require('npmview')

module.exports = function () {
  npmview('dat', function (err, version, moduleInfo) {
    if (err) {
      console.error(err)
      return
    }

    fs.writeFile('../.dat-version', version, function (err) {
      if (err) {
        console.error(err)
      }
    })
  })

  if (fs.existsSync('../.dat-version')) {
    var latestVersion = fs.readFileSync('../.dat-version', 'utf8')
    var pkg = require('../package.json')
    if (pkg.version !== latestVersion) {
      console.log(chalk.yellow('warning') + ' your version of Dat is ' +
               'out of date. The latest version is "' +
                latestVersion + '" while you are on "' + pkg.version + '".\n' +
                chalk.cyan('info') + ' To upgrade, run the following command:\n' +
                chalk.gray('$ npm install dat -g '))
    }
  }
}
