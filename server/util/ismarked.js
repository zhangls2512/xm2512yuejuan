const { spawn } = require('child_process')
const path = require('path')
function isMarked(page, coord) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [path.join(__dirname, 'ismarked.py')])
    py.stdin.write(JSON.stringify({
      img: page.image,
      x1: page.originCoord[0] + coord[0],
      y1: page.originCoord[1] + coord[1],
      x2: page.originCoord[0] + coord[2],
      y2: page.originCoord[1] + coord[3]
    }))
    py.stdin.end()
    let out = ''
    py.stdout.on('data', d => out += d)
    py.stdout.on('end', () => resolve(out == 'true' ? true : false))
  })
}
async function getAnswerIndex(page, questionname, pages) {
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
      const ismarked = await isMarked(pages[pageindex], coord[i])
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