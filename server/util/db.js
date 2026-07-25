const { MongoClient } = require('mongodb')
const { readConfig } = require('../../util/readconfig')
let db
async function database(configfilepath) {
  if (!db) {
    const client = new MongoClient(readConfig(configfilepath, 'mongodbUri'))
    await client.connect()
    db = client.db()
  }
  return db
}
module.exports = {
  database
}