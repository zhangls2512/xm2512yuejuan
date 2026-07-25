const fs = require('fs')
const https = require('https')
const { read, contenttype } = require('./util/file')
const { readConfig } = require('./util/readconfig')
async function dealRequest(event, configfilepath) {
  if (!event.path.startsWith('/api')) {
    const realpath = __dirname + '/web/dist' + event.path
    let validpaths = fs.readdirSync(__dirname + '/web/dist').filter(item => item != 'assets').map(item => __dirname + '/web/dist/' + item)
    validpaths = validpaths.concat(fs.readdirSync(__dirname + '/web/dist/assets').map(item => __dirname + '/web/dist/assets/' + item))
    if (!validpaths.includes(realpath)) {
      return {
        data: fs.readFileSync(__dirname + '/web/dist/index.html'),
        contentType: contenttype(__dirname + '/web/dist/index.html')
      }
    }
    return {
      data: fs.readFileSync(realpath),
      contentType: contenttype(realpath)
    }
  }
  if (event.path.startsWith('/api')) {
    if (event.method != 'POST') {
      return {
        data: JSON.stringify({
          errCode: 405,
          errMsg: '请求方法错误',
          errFix: '使用POST方法请求'
        }),
        contentType: 'application/json;charset=utf-8'
      }
    }
    const validpaths = []
    fs.readdirSync(__dirname + '/server/api').forEach(item => {
      validpaths.push('/api/' + item.replace('.js', ''))
    })
    if (!validpaths.includes(event.path)) {
      return {
        data: JSON.stringify({
          errCode: 400,
          errMsg: '请求路径错误',
          errFix: '无修复建议'
        }),
        contentType: 'application/json;charset=utf-8'
      }
    }
    const notparsebodypaths = ['getAccountInfo', 'getClassCount', 'getOnlineExamCount'].map(item => '/api/' + item)
    if (!notparsebodypaths.includes(event.path)) {
      try {
        JSON.parse(event.body)
      } catch {
        return {
          data: JSON.stringify({
            errCode: 400,
            errMsg: '请求体解析失败',
            errFix: '无修复建议'
          }),
          contentType: 'application/json;charset=utf-8'
        }
      }
    }
    const filepath = __dirname + '/server/api/' + event.path.split('/')[2] + '.js'
    const res = await require(filepath).main(event, configfilepath)
    return {
      data: JSON.stringify(res),
      contentType: 'application/json;charset=utf-8'
    }
  }
}
function start(configfilepath) {
  try {
    https.createServer({
      cert: fs.readFileSync(readConfig(configfilepath, 'certPath')),
      key: fs.readFileSync(readConfig(configfilepath, 'keyPath')),
      minVersion: 'TLSv1.3'
    }, (request, response) => {
      let body = ''
      request.on('data', chunk => {
        body += chunk
      })
      request.on('end', async () => {
        const timestamp = Date.now()
        try {
          const event = {
            method: request.method,
            path: request.url,
            headers: request.headers,
            body: body
          }
          const res = await dealRequest(event, configfilepath)
          response.setHeader('Content-Type', res.contentType)
          response.setHeader('Strict-Transport-Security', 'max-age=31536000')
          response.writeHead(200)
          response.end(res.data)
        } catch (err) {
          console.log(err)
          if (readConfig(configfilepath, 'saveErrorLog')) {
            fs.writeFileSync(readConfig(configfilepath, 'logRootPath') + '/error-' + timestamp + '.log', err.stack)
          }
          response.writeHead(500)
          response.end()
        }
      })
      request.on('error', () => {
        response.writeHead(400)
        response.end()
      })
    }).listen(readConfig(configfilepath, 'port'))
  } catch (err) {
    console.log(err.stack)
  }
}
module.exports = {
  start
}