module.exports = [
  {
    name: 'path',
    boolean: false,
    default: process.cwd(),
    abbr: 'p'
  },
  {
    name: 'help',
    boolean: true,
    abbr: 'h'
  },
  {
    name: 'checkout',
    boolean: false,
    abbr: 'c'
  },
  {
    name: 'json',
    boolean: true
  },
  {
    name: 'verbose',
    boolean: true,
    default: false
  }
]
