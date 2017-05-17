module.exports = function pluralize (str, val) {
  return `${str}${val === 1 ? '' : 's'}`
}
