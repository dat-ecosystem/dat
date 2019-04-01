module.exports = {
  name: 'pin',
  help: `Commands:
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
  `,
  options: [],
  command: function (opts) {
    var pin = require('dat-pin')

    pin(opts._)
  }
}
