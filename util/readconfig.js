function readConfig(configfilepath, key) {
  const config = require(configfilepath)
  return config[key]
}
module.exports = {
  readConfig
}