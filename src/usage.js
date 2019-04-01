module.exports = function (opts, help, usage) {
  if (opts.version) {
    var pkg = require('../package.json')
    console.error(pkg.version)
    process.exit(1)
  }
  var msg = `
Usage: dat <cmd> [<dir>] [options]

Sharing Files:
   dat share                   create dat, import files, share to network
   dat create                  create empty dat and dat.json
   dat sync                    import files to existing dat & sync with network

Downloading Files:
   dat clone <link> [<dir>]    download a dat via link to <dir>
   dat pull                    update dat & exit
   dat sync                    live sync files with the network

Info:
   dat log                     log history for a dat
   dat status                  get key & info about a local dat

Dat pinning services:
  dat pin add                Pin a 'dat://' read key to your pinning service to
                             keep it online
  dat pin remove             Remove a 'dat://' read key from your pinning
                             service
  dat pin list               List the 'dat://' read keys that you've pinned
  dat pin set-service        Set the URL of the pinning service you want to use
  dat pin unset-service      Resets your preferences to use your local pinning
                             service
  dat pin get-service        Get the URL for your pinning service
  dat pin login              Logs you into the configured pinning service. Not
                             necessary for local services
  dat pin logout             Logs you out of the pinning service
  dat pin run-service        Runs the pinning service without installing it in
                             the background.
  dat pin install-service    Installs a local pinning service on your computer.
                             This will run in the background while your computer
                             is active.
  dat pin uninstall-service  Uninstalls your local pinning service.

Stateless/Shortcut Commands:
   dat <link> [<dir>]          clone or sync link to <dir>
   dat <dir>                   create and sync dat in directory

Troubleshooting & Help:
   dat doctor                  run the dat network doctor
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
  process.exit(1)
}
