const { spawn } = require('child_process')
const path = require('path')
function isMarked(base64img, coord) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [path.join(__dirname, 'ismarked.py')])
    py.stdin.write(JSON.stringify({
      img: base64img,
      x1: coord[0],
      y1: coord[1],
      x2: coord[2],
      y2: coord[3]
    }))
    py.stdin.end()
    let out = ''
    py.stdout.on('data', d => out += d)
    py.stdout.on('end', () => resolve(out == 'true' ? true : false))
  })
}
async function getAnswerIndex(page, questionname, base64imgs) {
  let coord = []
  let pageindex = 0
  page.forEach((item, index) => {
    item.forEach(i => {
      if (i.objectiveQuestionName == questionname) {
        coord = i.coord
        pageindex = index
      }
    })
  })
  if (coord.length == 0) {
    return []
  }
  if (coord.length > 0) {
    const result = []
    for (let i = 0; i < coord.length; i++) {
      const ismarked = await isMarked(base64imgs[pageindex], coord[i])
      if (ismarked) {
        result.push(i)
      }
    }
    return result
  }
}
module.exports = {
  getAnswerIndex
}