const fs = require('fs')
const mime = require('mime-types')
const path = require('path')
function read(path) {
  if (!fs.existsSync(path)) {
    return ''
  }
  return fs.readFileSync(path, 'utf-8')
}
function write(filepath, data) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    })
  }
  fs.writeFileSync(filepath, data)
}
function contenttype(p) {
  return mime.contentType(path.extname(p))
}
function rmdir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
      recursive: true,
      force: true
    })
  }
}
function rmstartswith(rootdir, startswith) {
  if (fs.existsSync(rootdir)) {
    const paths = fs.readdirSync(rootdir)
    paths.forEach(item => {
      const files = fs.readdirSync(rootdir + item)
      const validfiles = files.filter(item => startswith.some(start => item.startsWith(start)))
      validfiles.forEach(file => {
        fs.unlinkSync(rootdir + item + '/' + file)
      })
    })
  }
}
module.exports = {
  read,
  write,
  rmdir,
  rmstartswith,
  contenttype
}