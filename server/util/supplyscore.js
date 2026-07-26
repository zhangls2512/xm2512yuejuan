function getScoreList(subjectconfig, csvstr) {
  const hangs = csvstr.split('\r\n')
  if (hangs.length < 2) {
    return false
  }
  const hang = hangs.map(item => item.split(','))
  const questions = subjectconfig.objectiveQuestion.concat(subjectconfig.subjectiveQuestion)
  if (!hang.every(item => item.length == questions.length + 2)) {
    return false
  }
  const firsthang = hang[0]
  for (let i = 0; i < firsthang.length; i++) {
    const item = firsthang[i]
    if (i > 1 && item != questions[i - 2].name) {
      return false
    }
  }
  const result = []
  function isOptionValid(arr, str) {
    if (!str) {
      return true
    }
    if (str.length > arr.length) {
      return false
    }
    let i = 0
    let j = 0
    while (i < arr.length && j < str.length) {
      if (arr[i] == str[j]) {
        j++
      }
      i++
    }
    return j == str.length
  }
  for (let i = 1; i < hang.length; i++) {
    const hangcontent = hang[i]
    const answers = []
    for (let j = 0; j < hangcontent.length; j++) {
      const item = hangcontent[j]
      if (j == 0 && (item.length != 36 || result.find(a => a.studentAccount == item))) {
        return false
      }
      if (j == 1 && !subjectconfig.volume.find(v => v.name == item)) {
        return false
      }
      if (j > 1 && item) {
        const question = questions[j - 2]
        if (question.option) {
          if (!isOptionValid(question.option, item)) {
            return false
          }
          answers.push({
            questionName: question.name,
            answer: item == '' ? [] : item.split('').map(c => question.option.indexOf(c))
          })
        } else {
          const stepscore = item.split(';').map(s => Number(s))
          if (stepscore.length != question.stepScore.length || !stepscore.every((s, index) => question.stepScore[index].includes(s))) {
            return false
          }
          answers.push({
            questionName: question.name,
            stepScore: stepscore
          })
        }
      }
    }
    const questionnames = answers.map(item => item.questionName)
    const volume = subjectconfig.volume.find(item => item.name == hangcontent[1])
    let allquestionnames = []
    volume.page.forEach(page => {
      page.forEach(q => {
        if (q.objectiveQuestionName) {
          allquestionnames = allquestionnames.push(q.objectiveQuestionName)
        }
        if (q.markGroupName) {
          const markgroup = subjectconfig.markGroup.find(item => item.name == q.markGroupName)
          allquestionnames = allquestionnames.concat(markgroup.questionName)
        }
      })
    })
    if (questionnames.some(q => !allquestionnames.includes(q))) {
      return false
    }
    let selectquestionnames = []
    volume.optionalQuestion.forEach(item => {
      selectquestionnames = selectquestionnames.concat(item.name)
    })
    const mustquestionnames = allquestionnames.filter(q => !selectquestionnames.includes(q))
    if (!mustquestionnames.every(q => questionnames.includes(q))) {
      return false
    }
    for (let k = 0; k < volume.optionalQuestion.length; k++) {
      const item = volume.optionalQuestion[k]
      if (questionnames.filter(s => item.name.includes(s)).length > item.selectCount) {
        return false
      }
    }
    result.push({
      studentAccount: hangcontent[0],
      volume: hangcontent[1],
      answers: answers
    })
  }
  return result
}
async function supplyScore(scorelist, subject, exam, account, configfilepath) {
  const crypto = require('crypto')
  const db = await (require('./db').database(configfilepath))
  const { sum } = require('./scorereport')
  let res = []
  if (!exam.schoolId) {
    res = await db.collection('account').find({
      type: 'student'
    }).toArray()
  }
  if (exam.schoolId) {
    res = await db.collection('account').find({
      schoolId: exam.schoolId,
      type: 'student'
    }).toArray()
  }
  const validstudents = res.map(item => item.account)
  for (let i = 0; i < scorelist.length; i++) {
    const item = scorelist[i]
    if (validstudents.includes(item.studentAccount)) {
      const answer = await db.collection('answer').findOne({
        examId: exam.examId,
        subject: subject.name,
        studentAccount: item.studentAccount
      })
      if (!answer) {
        if (!subject.answerOnline) {
          await db.collection('answer').insertOne({
            examId: exam.examId,
            subject: subject.name,
            studentAccount: item.studentAccount,
            answer: {
              volume: item.volume,
              pageOriginCoord: Array.from({
                length: subject.volume.find(v => v.name == item.volume).page.length
              }, () => [0, 0])
            },
            createTime: Date.now()
          })
        }
        if (subject.answerOnline) {
          await db.collection('answer').insertOne({
            examId: exam.examId,
            subject: subject.name,
            studentAccount: item.studentAccount,
            createTime: Date.now()
          })
        }
        const marklogarr = []
        item.answers.forEach(a => {
          if (a.answer) {
            marklogarr.push({
              examId: exam.examId,
              subject: subject.name,
              studentAccount: item.studentAccount,
              questionName: a.questionName,
              type: 'system',
              answer: a.answer,
              finished: true
            })
          }
          if (a.stepScore) {
            const marklogid = crypto.randomUUID()
            const totalscore = sum(a.stepScore)
            marklogarr.push({
              examId: exam.examId,
              subject: subject.name,
              studentAccount: item.studentAccount,
              questionName: a.questionName,
              type: 'system',
              marklogId: marklogid,
              firstMarkerAccount: '',
              secondMarkerAccount: '',
              thirdMarkerAccount: '',
              arbitrateMarkerAccount: '',
              questionMarkerAccount: '',
              updateMarkerAccount: account,
              firstMarkStepScore: [],
              secondMarkStepScore: [],
              thirdMarkStepScore: [],
              arbitrateMarkStepScore: [],
              questionMarkStepScore: [],
              updateMarkStepScore: a.stepScore,
              questionReason: '',
              minScoreDiff: 0,
              finalStepScore: a.stepScore,
              finalTotalScore: totalscore
            })
            marklogarr.push({
              marklogId: marklogid,
              examId: exam.examId,
              subject: subject.name,
              studentAccount: item.studentAccount,
              questionName: a.questionName,
              markerAccount: account,
              excellent: false,
              typicalMistake: false,
              type: 'update',
              stepScore: a.stepScore,
              totalScore: totalscore
            })
          }
        })
        await db.collection('marklog').insertMany(marklogarr)
      }
    }
  }
}
module.exports = {
  getScoreList,
  supplyScore
}