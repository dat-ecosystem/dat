module.exports = function (opts, help, usage) {
  if (opts.version) {
    var pkg = require('../package.json')
    console.error(pkg.version)
    process.exit(1)
  }
  var msg = `

   dat <link> [<dir>]          clone or sync link to <dir>
   dat <dir>                   create and sync dat in directory

Other commands:
   dat create <dir>            create empty dat and dat.json
   dat sync <dir>              live sync files with the network
   dat clone <link> [<dir>]    download a dat via link to <dir>
   dat pull                    update dat & exit
   dat log                     log history for a dat
   dat status                  get key & info about a local dat
   dat keys [import/export]    import and export private keys

Troubleshooting & Help:
   dat help                    print this usage guide
   dat <command> --help, -h    print help for a specific command
   dat --version, -v           print the dat version

  `
  console.error(msg)
  if (usage) {
    console.error('General Options:')
    console.error(usage)
  }
  console.error('Have fun using Dat! Learn more at docs.datproject.org')
  process.exit(0)
}
