module.exports = function(dat, req, res) {
  res.setHeader('content-type', 'application/json')
  if (req.url.match(/^\/_package/)) return getPackage(dat, req, res)
  res.end(JSON.stringify({dat: true}))
}

function getPackage(dat, req, res) {
  res.statusCode = 200
  res.end(JSON.stringify(dat.meta.json))
}