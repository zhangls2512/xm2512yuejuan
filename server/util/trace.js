function getScanTrace(subjectconfig, marklogarr, pagesorigincoord, volume) {
  const { calcObjectiveScore, sum } = require('./scorereport')
  const pages = subjectconfig.volume.find(item => item.name == volume).page
  const result = Array.from({
    length: pagesorigincoord.length
  }, () => [])
  let totalscore = 0
  const markgroups = {}
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
      if (!markgroups[markgroupname]) {
        markgroups[markgroupname] = []
      }
      const fullscore = sum(question.stepScore.map(s => s[0]))
      markgroups[markgroupname].push({
        questionName: item.questionName,
        stepScore: item.finalStepScore,
        totalScore: item.finalTotalScore,
        fullScore: fullscore,
        traceImage: item.traceImage
      })
      totalscore += item.finalTotalScore
    }
  })
  Object.entries(markgroups).forEach(([markgroupname, questions]) => {
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
      questions.forEach(q => {
        result[coord.pageindex].push({
          type: 'image',
          content: q.traceImage[index],
          coord: [pagesorigincoord[coord.pageindex][0] + coord.coord[0], pagesorigincoord[coord.pageindex][1] + coord.coord[1]],
          position: 'lefttop'
        })
      })
    })
    if (questions.length == 1) {
      const item = questions[0]
      result[coord[0].pageindex].push({
        type: 'text',
        content: item.stepScore.length > 1 ? ['-' + (item.fullScore - item.totalScore)].concat(item.stepScore.map((s, i) => '步骤' + (i + 1) + '：' + s + '分')).join('\n') : '-' + (item.fullScore - item.totalScore),
        coord: [pagesorigincoord[coord[0].pageindex][0] + coord[0].coord[2], pagesorigincoord[coord[0].pageindex][1] + coord[0].coord[1]],
        position: 'righttop',
        size: 24
      })
      let imgpath = ''
      if (item.totalScore == 0) {
        imgpath = '/cuo.png'
      }
      if (item.totalScore > 0 && item.totalScore < item.fullScore) {
        imgpath = '/bandui.png'
      }
      if (item.totalScore == item.fullScore) {
        imgpath = '/dui.png'
      }
      result[coord[coord.length - 1].pageindex].push({
        type: 'image',
        content: imgpath,
        coord: [pagesorigincoord[coord[coord.length - 1].pageindex][0] + coord[coord.length - 1].coord[2], pagesorigincoord[coord[coord.length - 1].pageindex][1] + coord[coord.length - 1].coord[3]],
        position: 'rightbottom'
      })
    } else {
      result[coord[0].pageindex].push({
        type: 'text',
        content: questions.map(q => {
          const result = [q.questionName + '：-' + (q.fullScore - q.totalScore)]
          if (q.stepScore.length > 1) {
            q.stepScore.forEach((s, i) => {
              result.push('步骤' + (i + 1) + '：' + s + '分')
            })
          }
          return result.join(' ')
        }).join('\n'),
        coord: [pagesorigincoord[coord[0].pageindex][0] + coord[0].coord[2], pagesorigincoord[coord[0].pageindex][1] + coord[0].coord[1]],
        position: 'righttop',
        size: 24
      })
      const alltotalscore = sum(questions.map(item => item.totalScore))
      const allfullscore = sum(questions.map(item => item.fullScore))
      let imgpath = ''
      if (alltotalscore == 0) {
        imgpath = '/cuo.png'
      }
      if (alltotalscore > 0 && alltotalscore < allfullscore) {
        imgpath = '/bandui.png'
      }
      if (alltotalscore == allfullscore) {
        imgpath = '/dui.png'
      }
      result[coord[coord.length - 1].pageindex].push({
        type: 'image',
        content: imgpath,
        coord: [pagesorigincoord[coord[coord.length - 1].pageindex][0] + coord[coord.length - 1].coord[2], pagesorigincoord[coord[coord.length - 1].pageindex][1] + coord[coord.length - 1].coord[3]],
        position: 'rightbottom'
      })
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
  const markgroups = {}
  marklogarr.forEach((item, index) => {
    const question = subjectconfig.subjectiveQuestion.find(i => i.name == item.questionName)
    const markgroupname = subjectconfig.markGroup.find(i => i.questionName.includes(item.questionName)).name
    if (!markgroups[markgroupname]) {
      markgroups[markgroupname] = []
    }
    const fullscore = sum(question.stepScore.map(s => s[0]))
    markgroups[markgroupname].push({
      questionName: item.questionName,
      stepScore: item.finalStepScore,
      totalScore: item.finalTotalScore,
      fullScore: fullscore,
      traceImage: item.traceImage,
      resultIndex: index
    })
  })
  Object.entries(markgroups).forEach(([markgroupname, questions]) => {
    questions.forEach(q => {
      result[q.resultIndex].push({
        type: 'image',
        content: q.traceImage[0],
        position: 'lefttop'
      })
    })
    if (questions.length == 1) {
      const item = questions[0]
      result[item.resultIndex].push({
        type: 'text',
        content: item.stepScore.length > 1 ? ['-' + (item.fullScore - item.totalScore)].concat(item.stepScore.map((s, i) => '步骤' + (i + 1) + '：' + s + '分')).join('\n') : '-' + (item.fullScore - item.totalScore),
        position: 'righttop',
        size: 24
      })
      let imgpath = ''
      if (item.totalScore == 0) {
        imgpath = '/cuo.png'
      }
      if (item.totalScore > 0 && item.totalScore < item.fullScore) {
        imgpath = '/bandui.png'
      }
      if (item.totalScore == item.fullScore) {
        imgpath = '/dui.png'
      }
      result[item.resultIndex].push({
        type: 'image',
        content: imgpath,
        position: 'rightbottom'
      })
    } else {
      result[questions[0].resultIndex].push({
        type: 'text',
        content: questions.map(q => {
          const result = [q.questionName + '：-' + (q.fullScore - q.totalScore)]
          if (q.stepScore.length > 1) {
            q.stepScore.forEach((s, i) => {
              result.push('步骤' + (i + 1) + '：' + s + '分')
            })
          }
          return result.join(' ')
        }).join('\n'),
        position: 'righttop',
        size: 24
      })
      const alltotalscore = sum(questions.map(item => item.totalScore))
      const allfullscore = sum(questions.map(item => item.fullScore))
      let imgpath = ''
      if (alltotalscore == 0) {
        imgpath = '/cuo.png'
      }
      if (alltotalscore > 0 && alltotalscore < allfullscore) {
        imgpath = '/bandui.png'
      }
      if (alltotalscore == allfullscore) {
        imgpath = '/dui.png'
      }
      result[questions[0].resultIndex].push({
        type: 'image',
        content: imgpath,
        position: 'rightbottom'
      })
    }
  })
  return result
}
module.exports = {
  getScanTrace,
  getOnlineTrace
}