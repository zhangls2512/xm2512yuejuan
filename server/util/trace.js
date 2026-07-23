function getScanTrace(subjectconfig, marklogarr, pagesorigincoord, volume) {
  const { calcObjectiveScore, sum } = require('./scorereport')
  const pages = subjectconfig.volume.find(item => item.name == volume).page
  const result = Array.from({
    length: pagesorigincoord.length
  }, () => [])
  let totalscore = 0
  marklogarr.forEach(item => {
    if (item.answer) {
      const question = subjectconfig.objectiveQuestion.find(i => i.name == item.questionName)
      let coord = []
      let pageindex = 0
      for (let i = 0; i < pages.length; i++) {
        const q = pages[i].find(pi => pi.objectiveQuestionName == item.questionName)
        if (q) {
          coord = q.coord
          pageindex = i
          break
        }
      }
      item.answer.forEach(o => {
        result[pageindex].push({
          type: 'rect',
          coord: [pagesorigincoord[pageindex][0] + coord[o][0], pagesorigincoord[pageindex][1] + coord[o][1], pagesorigincoord[pageindex][0] + coord[o][2], pagesorigincoord[pageindex][1] + coord[o][3]],
          color: question.correctOptionIndex.includes(o) ? 'green' : 'red'
        })
      })
      totalscore += calcObjectiveScore(question, item.answer)
    } else {
      const question = subjectconfig.subjectiveQuestion.find(i => i.name == item.questionName)
      const markgroupname = subjectconfig.markGroup.find(i => i.questionName.includes(item.questionName)).name
      let coord = []
      for (let i = 0; i < pages.length; i++) {
        const q = pages[i].find(pi => pi.markGroupName == markgroupname)
        if (q) {
          coord = coord.concat(q.coord.map(c => {
            return {
              coord: c,
              pageindex: i
            }
          }))
        }
      }
      coord.forEach((coord, index) => {
        result[coord.pageindex].push({
          type: 'image',
          content: item.traceImage[index],
          coord: [pagesorigincoord[coord.pageindex][0] + coord.coord[0], pagesorigincoord[coord.pageindex][1] + coord.coord[1]],
          position: 'lefttop'
        })
      })
      const fullscore = sum(question.stepScore.map(s => s[0]))
      result[coord[0].pageindex].push({
        type: 'text',
        content: item.finalStepScore.length > 1 ? ['-' + (fullscore - item.finalTotalScore)].concat(item.finalStepScore.map((s, i) => '步骤' + (i + 1) + '：' + s + '分')).join('\n') : '-' + (fullscore - item.finalTotalScore),
        coord: [pagesorigincoord[coord[0].pageindex][0] + coord[0].coord[2], pagesorigincoord[coord[0].pageindex][1] + coord[0].coord[1]],
        position: 'righttop',
        size: 24
      })
      let imgpath = ''
      if (item.finalTotalScore == 0) {
        imgpath = '/cuo.png'
      }
      if (item.finalTotalScore > 0 && item.finalTotalScore < fullscore) {
        imgpath = '/bandui.png'
      }
      if (item.finalTotalScore == fullscore) {
        imgpath = '/dui.png'
      }
      result[coord[coord.length - 1].pageindex].push({
        type: 'image',
        content: imgpath,
        coord: [pagesorigincoord[coord[coord.length - 1].pageindex][0] + coord[coord.length - 1].coord[2], pagesorigincoord[coord[coord.length - 1].pageindex][1] + coord[coord.length - 1].coord[3]],
        position: 'rightbottom'
      })
      totalscore += item.finalTotalScore
    }
  })
  result[0].push({
    type: 'text',
    content: String(totalscore),
    coord: [pagesorigincoord[0][0] + 10, pagesorigincoord[0][1] + 10],
    position: 'lefttop',
    size: 60
  })
  return result
}
function getOnlineTrace(subjectconfig, marklogarr) {
  const { calcObjectiveScore, sum } = require('./scorereport')
  const result = Array.from({
    length: marklogarr.length
  }, () => [])
  marklogarr.forEach((item, index) => {
    const question = subjectconfig.subjectiveQuestion.find(i => i.name == item.questionName)
    const markgroupname = subjectconfig.markGroup.find(i => i.questionName.includes(item.questionName)).name
    result[index].push({
      type: 'image',
      content: item.traceImage[0],
      position: 'lefttop'
    })
    const fullscore = sum(question.stepScore.map(s => s[0]))
    result[index].push({
      type: 'text',
      content: ['-' + (fullscore - item.finalTotalScore)].concat(item.finalStepScore.map((s, i) => '步骤' + (i + 1) + '：' + s + '分')).join('\n'),
      position: 'righttop',
      size: 24
    })
    let imgpath = ''
    if (item.finalTotalScore == 0) {
      imgpath = '/cuo.png'
    }
    if (item.finalTotalScore > 0 && item.finalTotalScore < fullscore) {
      imgpath = '/bandui.png'
    }
    if (item.finalTotalScore == fullscore) {
      imgpath = '/dui.png'
    }
    result[index].push({
      type: 'image',
      content: imgpath,
      position: 'rightbottom'
    })
  })
  return result
}
module.exports = {
  getScanTrace,
  getOnlineTrace
}