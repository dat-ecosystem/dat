var log = require('dat-log')

module.exports = {
  name: 'log',
  help: [
    'View history and information about a dat',
    '',
    'Usage: dat log [dir|link]'
  ].join('\n'),
  options: [
    {
      name: 'live',
      boolean: true,
      default: false,
      help: 'View live updates to history.'
    }
  ],
  command: log
}
