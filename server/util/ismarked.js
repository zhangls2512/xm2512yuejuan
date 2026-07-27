const { spawn } = require('child_process')
const fs = require('fs')
const { readConfig } = require('../../util/readconfig')
function batchIsMarkedPerPage(page, questions, configfilepath) {
  return new Promise((resolve, reject) => {
    const py = spawn(readConfig(configfilepath, 'pythonVenvPath'), [__dirname + '/ismarked.py'])
    py.stdin.write(JSON.stringify({
      img: page.image,
      questions: questions.map(q => {
        return {
          questionName: q.questionName,
          coords: q.coords.map(coord => {
            return [page.originCoord[0] + coord[0], page.originCoord[1] + coord[1], page.originCoord[0] + coord[2], page.originCoord[1] + coord[3]]
          })
        }
      })
    }))
    py.stdin.end()
    let out = ''
    let error = false
    py.stdout.on('data', d => out += d)
    py.stderr.on('data', d => {
      error = true
      if (readConfig(configfilepath, 'saveErrorLog')) {
        fs.writeFileSync(readConfig(configfilepath, 'logRootPath') + '/error-' + Date.now() + '.log', String(d))
      }
      py.kill('SIGKILL')
    })
    py.on('close', () => {
      if (error) {
        resolve([])
      } else {
        try {
          resolve(JSON.parse(out))
        } catch {
          resolve([])
        }
      }
    })
  })
}
async function getAnswerIndex(page, pages, configfilepath, questionnames) {
  const tasks = page.map((pageitem, index) => {
    const questions = []
    pageitem.forEach(item => {
      if (questionnames.includes(item.objectiveQuestionName)) {
        questions.push({
          questionName: item.objectiveQuestionName,
          coords: item.coord
        })
      }
    })
    return batchIsMarkedPerPage(pages[index], questions, configfilepath)
  })
  const result = await Promise.all(tasks)
  return result.flat()
}
module.exports = {
  getAnswerIndex
}