const { spawn } = require('child_process')
const path = require('path')
function isMarked(base64img, x1, y1, x2, y2) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [path.join(__dirname, 'ismarked.py')])
    py.stdin.write(JSON.stringify({
      img: base64img,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    }))
    py.stdin.end()
    let out = ''
    py.stdout.on('data', d => out += d)
    py.stdout.on('end', () => resolve(out == 'true' ? true : false))
  })
}
module.exports = {
  isMarked
}