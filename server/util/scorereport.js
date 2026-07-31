const crypto = require('crypto')
function sum(arr) {
  return arr.reduce((sum, num) => sum + num, 0)
}
function average(arr) {
  if (arr.length == 0) {
    return 0
  }
  return fixtwo(sum(arr) / arr.length)
}
function standarddeviation(arr) {
  if (arr.length == 0) {
    return 0
  }
  const averagescore = average(arr)
  return fixtwo(Math.sqrt(arr.reduce((s, x) => s + (x - averagescore) ** 2, 0) / arr.length))
}
function calcDiscrimination(scorearr, fullscore = 0) {
  const sorted = scorearr.sort((a, b) => a - b)
  const n = sorted.length
  const groupsize = Math.floor(n * 0.27)
  if (groupsize == 0) {
    return 0
  }
  const lowavg = sum(sorted.slice(0, groupsize)) / groupsize
  const highavg = sum(sorted.slice(-groupsize)) / groupsize
  const cha = highavg - lowavg
  if (fullscore == 0) {
    return cha
  }
  if (fullscore != 0) {
    return fixtwo(cha / fullscore)
  }
}
function fixtwo(num) {
  return Number(num.toFixed(2))
}
function calcObjectiveScore(config, answer) {
  const specialrules = config.specialOptionGroupRule.map(item => {
    return {
      rule: item.optionIndex.join(','),
      score: item.score
    }
  })
  const specialanswer = answer.join(',')
  const exist = specialrules.find(item => item.rule == specialanswer)
  if (exist) {
    return exist.score
  }
  const zerocorrectoptioncount = config.correctOptionCountRule.find(item => item.count == 0)
  if (config.correctOptionIndex.length == 0) {
    return zerocorrectoptioncount ? zerocorrectoptioncount.score : 0
  }
  let correctoptioncount = 0
  for (let i = 0; i < answer.length; i++) {
    const item = answer[i]
    const iscorrect = config.correctOptionIndex.includes(item)
    if (!iscorrect) {
      return 0
    }
    correctoptioncount++
  }
  const correctoptioncountrule = config.correctOptionCountRule.find(item => item.count == correctoptioncount)
  return correctoptioncountrule ? correctoptioncountrule.score : 0
}
function generateGradedReport(rawscores, levels) {
  if (rawscores.length == 0) {
    return []
  }
  const sorted = [...rawscores].sort((a, b) => b - a)
  function getendindex(value) {
    const a = Math.floor(value) - 1
    return a < 0 ? 0 : a
  }
  const endindex = levels.map(item => getendindex(sorted.length * item.ratio))
  const levelrawscore = []
  let lastindex = 0
  let currentlevelindex = 0
  let score = 0
  while (currentlevelindex < endindex.length && lastindex < sorted.length) {
    levelrawscore.push({
      min: sorted[endindex[currentlevelindex]],
      max: currentlevelindex == 0 ? sorted[0] : score,
    })
    score = sorted[endindex[currentlevelindex]]
    let currentindex = endindex[currentlevelindex]
    while (score == sorted[endindex[currentlevelindex]]) {
      endindex[currentlevelindex] = currentindex
      currentindex++
      score = sorted[currentindex]
    }
    lastindex = currentindex
    currentlevelindex++
  }
  const result = []
  let levelindex = 0
  let rawscorediff = levelrawscore[levelindex].max - levelrawscore[levelindex].min
  let levelscorediff = levels[levelindex].max - levels[levelindex].min
  for (let i = 0; i < sorted.length; i++) {
    if (i > endindex[levelindex]) {
      levelindex++
      rawscorediff = levelrawscore[levelindex].max - levelrawscore[levelindex].min
      levelscorediff = levels[levelindex].max - levels[levelindex].min
    }
    const item = sorted[i]
    result.push({
      rawScore: item,
      fuScore: Math.round(rawscorediff == 0 ? (levels[levelindex].min + (levelscorediff / 2)) : (levels[levelindex].min + ((item - levelrawscore[levelindex].min) * levelscorediff) / rawscorediff)),
      level: levels[levelindex].level
    })
  }
  return result
}
function getstudentinfo(studentid, classes) {
  let schoolId = ''
  const classId = []
  classes.forEach(item => {
    if (item.student.includes(studentid)) {
      schoolId = item.schoolId
      classId.push(item.classId)
    }
  })
  return {
    schoolId: schoolId,
    classId: classId
  }
}
async function getScoreReport(subject, classes, marklog, config, schoolid, configfilepath) {
  const db = await (require('./db').database(configfilepath))
  const questionmap = {}
  subject.objectiveQuestion.forEach(i => {
    if (config.scoringQuestionNames.includes(i.name)) {
      questionmap[i.name] = {
        objective: true,
        extra: i.extra,
        totalscore: Math.max(...[...new Set(i.correctOptionCountRule.map(item => item.score).concat(i.specialOptionGroupRule.map(item => item.score)))]),
        rule: i,
        answer: i.correctOptionIndex.length > 0 ? i.correctOptionIndex.map(item => i.option[item]).join('') : '未选'
      }
    }
  })
  subject.subjectiveQuestion.forEach(i => {
    if (config.scoringQuestionNames.includes(i.name)) {
      questionmap[i.name] = {
        objective: false,
        extra: i.extra,
        totalscore: sum(i.stepScore.map(item => item[0]))
      }
    }
  })
  const questions = subject.objectiveQuestion.concat(subject.subjectiveQuestion).filter(item => item.questionId && config.scoringQuestionNames.includes(item.name))
  const questionidnamemap = {}
  questions.forEach(item => {
    if (!questionidnamemap[item.questionId]) {
      questionidnamemap[item.questionId] = []
    }
    questionidnamemap[item.questionId].push(item.name)
  })
  const questionknowledgepointmap = {}
  const qa = await db.collection('question').find({
    questionId: {
      $in: Object.keys(questionidnamemap)
    },
    schoolId: schoolid
  }).toArray()
  qa.forEach(item => {
    questionidnamemap[item.questionId].forEach(qn => {
      questionknowledgepointmap[qn] = item.knowledgepoint
    })
  })
  const knowledgepointquestionmap = {}
  Object.entries(questionknowledgepointmap).forEach(([question, knowledgepoint]) => {
    knowledgepoint.forEach(k => {
      if (!knowledgepointquestionmap[k]) {
        knowledgepointquestionmap[k] = []
      }
      knowledgepointquestionmap[k].push(question)
    })
  })
  const studentmap = {}
  const jointmap = {
    question: {},
    knowledgepoint: {},
    school: [],
    student: {}
  }
  const schoolmap = {}
  const classmap = {}
  marklog.forEach(r => {
    const questioninfo = questionmap[r.questionName]
    if (questioninfo) {
      if (!studentmap[r.studentAccount]) {
        const info = getstudentinfo(r.studentAccount, classes)
        studentmap[r.studentAccount] = {
          schoolId: info.schoolId,
          classId: info.classId
        }
        jointmap.student[r.studentAccount] = {
          account: r.studentAccount,
          totalScoreWithExtra: 0,
          totalScoreWithoutExtra: 0,
          extraTotalScore: 0
        }
      }
      if (!jointmap.question[r.questionName]) {
        if (questioninfo.objective) {
          jointmap.question[r.questionName] = {
            option: Array.from({ length: questioninfo.rule.option.length }, () => []),
            optionName: questioninfo.rule.option,
            scorelist: []
          }
        }
        if (!questioninfo.objective) {
          jointmap.question[r.questionName] = {
            score: {},
            scorelist: []
          }
        }
      }
      const score = questioninfo.objective ? calcObjectiveScore(questioninfo.rule, r.answer) : r.finalTotalScore
      if (questioninfo.objective) {
        r.answer.forEach(item => {
          jointmap.question[r.questionName].option[item].push(r.studentAccount)
        })
      }
      if (!questioninfo.objective) {
        if (!jointmap.question[r.questionName].score[score]) {
          jointmap.question[r.questionName].score[score] = []
        }
        jointmap.question[r.questionName].score[score].push(r.studentAccount)
      }
      jointmap.question[r.questionName].scorelist.push(score)
      jointmap.student[r.studentAccount].totalScoreWithExtra += score
      if (questionknowledgepointmap[r.questionName]) {
        questionknowledgepointmap[r.questionName].forEach(k => {
          if (!jointmap.knowledgepoint[k]) {
            jointmap.knowledgepoint[k] = {
              name: k,
              questionName: knowledgepointquestionmap[k],
              score: 0,
              fullscore: 0
            }
          }
          jointmap.knowledgepoint[k].score += score
          jointmap.knowledgepoint[k].fullscore += questionmap[r.questionName].totalscore
        })
      }
      if (!questioninfo.extra) {
        jointmap.student[r.studentAccount].totalScoreWithoutExtra += score
      }
      if (questioninfo.extra) {
        jointmap.student[r.studentAccount].extraTotalScore += score
      }
      const studentinfo = studentmap[r.studentAccount]
      if (studentinfo.schoolId) {
        if (!schoolmap[studentinfo.schoolId]) {
          schoolmap[studentinfo.schoolId] = {
            schoolId: studentinfo.schoolId,
            question: {},
            knowledgepoint: {},
            student: []
          }
        }
        if (!schoolmap[studentinfo.schoolId].question[r.questionName]) {
          if (questioninfo.objective) {
            schoolmap[studentinfo.schoolId].question[r.questionName] = {
              option: Array.from({ length: questioninfo.rule.option.length }, () => []),
              optionName: questioninfo.rule.option,
              scorelist: []
            }
          }
          if (!questioninfo.objective) {
            schoolmap[studentinfo.schoolId].question[r.questionName] = {
              score: {},
              scorelist: []
            }
          }
        }
        if (questioninfo.objective) {
          r.answer.forEach(item => {
            schoolmap[studentinfo.schoolId].question[r.questionName].option[item].push(r.studentAccount)
          })
        }
        if (!questioninfo.objective) {
          if (!schoolmap[studentinfo.schoolId].question[r.questionName].score[score]) {
            schoolmap[studentinfo.schoolId].question[r.questionName].score[score] = []
          }
          schoolmap[studentinfo.schoolId].question[r.questionName].score[score].push(r.studentAccount)
        }
        schoolmap[studentinfo.schoolId].question[r.questionName].scorelist.push(score)
        if (questionknowledgepointmap[r.questionName]) {
          questionknowledgepointmap[r.questionName].forEach(k => {
            if (!schoolmap[studentinfo.schoolId].knowledgepoint[k]) {
              schoolmap[studentinfo.schoolId].knowledgepoint[k] = {
                name: k,
                questionName: knowledgepointquestionmap[k],
                score: 0,
                fullscore: 0
              }
            }
            schoolmap[studentinfo.schoolId].knowledgepoint[k].score += score
            schoolmap[studentinfo.schoolId].knowledgepoint[k].fullscore += questionmap[r.questionName].totalscore
          })
        }
      }
      studentinfo.classId.forEach(classid => {
        if (!classmap[classid]) {
          classmap[classid] = {
            classId: classid,
            question: {},
            knowledgepoint: {},
            student: []
          }
        }
        if (!classmap[classid].question[r.questionName]) {
          if (questioninfo.objective) {
            classmap[classid].question[r.questionName] = {
              option: Array.from({ length: questioninfo.rule.option.length }, () => []),
              optionName: questioninfo.rule.option,
              scorelist: []
            }
          }
          if (!questioninfo.objective) {
            classmap[classid].question[r.questionName] = {
              score: {},
              scorelist: []
            }
          }
        }
        if (questioninfo.objective) {
          r.answer.forEach(item => {
            classmap[classid].question[r.questionName].option[item].push(r.studentAccount)
          })
        }
        if (!questioninfo.objective) {
          if (!classmap[classid].question[r.questionName].score[score]) {
            classmap[classid].question[r.questionName].score[score] = []
          }
          classmap[classid].question[r.questionName].score[score].push(r.studentAccount)
        }
        classmap[classid].question[r.questionName].scorelist.push(score)
        if (questionknowledgepointmap[r.questionName]) {
          questionknowledgepointmap[r.questionName].forEach(k => {
            if (!classmap[classid].knowledgepoint[k]) {
              classmap[classid].knowledgepoint[k] = {
                name: k,
                questionName: knowledgepointquestionmap[k],
                score: 0,
                fullscore: 0
              }
            }
            classmap[classid].knowledgepoint[k].score += score
            classmap[classid].knowledgepoint[k].fullscore += questionmap[r.questionName].totalscore
          })
        }
      })
    }
  })
  jointmap.knowledgepoint = Object.values(jointmap.knowledgepoint).map(item => {
    return {
      name: item.name,
      questionName: item.questionName,
      scoringRate: fixtwo((item.score / item.fullscore) * 100)
    }
  })
  jointmap.student = Object.values(jointmap.student)
  if (config.fuScoreRule.length > 0) {
    const ff = generateGradedReport(jointmap.student.map(item => item.totalScoreWithoutExtra), config.fuScoreRule)
    const ffmap = {}
    ff.forEach(i => {
      ffmap[i.rawScore] = {
        fuScore: i.fuScore,
        level: i.level
      }
    })
    jointmap.student.forEach(item => {
      item.fuScore = ffmap[item.totalScoreWithoutExtra].fuScore
      item.level = ffmap[item.totalScoreWithoutExtra].level
    })
  }
  const sortkey = config.fuScoreRule.length > 0 ? 'fuScore' : 'totalScoreWithoutExtra'
  jointmap.student.sort((a, b) => b[sortkey] - a[sortkey])
  jointmap.student.forEach((item, index) => {
    if (index > 0 && item[sortkey] == jointmap.student[index - 1][sortkey]) {
      jointmap.student[index].jointRank = jointmap.student[index - 1].jointRank
    } else {
      jointmap.student[index].jointRank = index + 1
    }
  })
  if (config.scoreTimes != 1) {
    jointmap.student.forEach(item => {
      item.totalScoreWithoutExtra = fixtwo(item.totalScoreWithoutExtra * config.scoreTimes)
    })
  }
  const jointstudentscorearr = jointmap.student.map(item => config.fuScoreRule.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
  jointmap.averageScore = average(jointstudentscorearr)
  jointmap.scoreStandardDeviation = standarddeviation(jointstudentscorearr)
  jointmap.discrimination = calcDiscrimination(jointstudentscorearr)
  jointmap.question = Object.entries(jointmap.question).map(q => {
    const averagescore = average(q[1].scorelist)
    const scorestandarddeviation = standarddeviation(q[1].scorelist)
    const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
    if (q[1].option) {
      return {
        name: q[0],
        option: q[1].option,
        optionName: q[1].optionName,
        answer: questionmap[q[0]].answer,
        averageScore: averagescore,
        scoringRate: fixtwo(scoringrate),
        scoreStandardDeviation: scorestandarddeviation,
        discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
      }
    }
    if (q[1].score) {
      return {
        name: q[0],
        score: Object.entries(q[1].score).map(s => {
          return {
            score: Number(s[0]),
            student: s[1]
          }
        }).sort((a, b) => b.score - a.score),
        averageScore: averagescore,
        scoringRate: fixtwo(scoringrate),
        scoreStandardDeviation: scorestandarddeviation,
        discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
      }
    }
  })
  const classschoolmap = {}
  jointmap.student.forEach(item => {
    const studentinfo = studentmap[item.account]
    if (studentinfo.schoolId) {
      schoolmap[studentinfo.schoolId].student.push(item)
    }
    studentinfo.classId.forEach(classid => {
      classmap[classid].student.push(item)
      classschoolmap[classid] = studentinfo.schoolId
    })
  })
  const schoolrankmap = {}
  Object.keys(schoolmap).forEach(schoolid => {
    schoolmap[schoolid].knowledgepoint = Object.values(schoolmap[schoolid].knowledgepoint).map(item => {
      return {
        name: item.name,
        questionName: item.questionName,
        scoringRate: fixtwo((item.score / item.fullscore) * 100)
      }
    })
    const clonestudent = schoolmap[schoolid].student.map(s => ({
      ...s,
      schoolRank: undefined
    }))
    clonestudent.forEach((item, index) => {
      if (index > 0 && item[sortkey] == clonestudent[index - 1][sortkey]) {
        item.schoolRank = clonestudent[index - 1].schoolRank
        schoolrankmap[item.account] = clonestudent[index - 1].schoolRank
      } else {
        item.schoolRank = index + 1
        schoolrankmap[item.account] = index + 1
      }
    })
    schoolmap[schoolid].class = []
    schoolmap[schoolid].student = clonestudent
    const schoolstudentscorearr = schoolmap[schoolid].student.map(item => config.fuScoreRule.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
    schoolmap[schoolid].averageScore = average(schoolstudentscorearr)
    schoolmap[schoolid].scoreStandardDeviation = standarddeviation(schoolstudentscorearr)
    schoolmap[schoolid].discrimination = calcDiscrimination(schoolstudentscorearr)
    schoolmap[schoolid].question = Object.entries(schoolmap[schoolid].question).map(q => {
      const averagescore = average(q[1].scorelist)
      const scorestandarddeviation = standarddeviation(q[1].scorelist)
      const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
      if (q[1].option) {
        return {
          name: q[0],
          option: q[1].option,
          optionName: q[1].optionName,
          answer: questionmap[q[0]].answer,
          averageScore: averagescore,
          scoringRate: fixtwo(scoringrate),
          scoreStandardDeviation: scorestandarddeviation,
          discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
        }
      }
      if (q[1].score) {
        return {
          name: q[0],
          score: Object.entries(q[1].score).map(s => {
            return {
              score: Number(s[0]),
              student: s[1]
            }
          }).sort((a, b) => b.score - a.score),
          averageScore: averagescore,
          scoringRate: fixtwo(scoringrate),
          scoreStandardDeviation: scorestandarddeviation,
          discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
        }
      }
    })
  })
  Object.keys(classmap).forEach(classid => {
    classmap[classid].knowledgepoint = Object.values(classmap[classid].knowledgepoint).map(item => {
      return {
        name: item.name,
        questionName: item.questionName,
        scoringRate: fixtwo((item.score / item.fullscore) * 100)
      }
    })
    const clonestudent = classmap[classid].student.map(s => ({
      ...s,
      classRank: undefined
    }))
    clonestudent.forEach((item, index) => {
      item.schoolRank = schoolrankmap[item.account]
      if (index > 0 && item[sortkey] == clonestudent[index - 1][sortkey]) {
        item.classRank = clonestudent[index - 1].classRank
      } else {
        item.classRank = index + 1
      }
    })
    classmap[classid].student = clonestudent
    const classstudentscorearr = classmap[classid].student.map(item => config.fuScoreRule.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
    classmap[classid].averageScore = average(classstudentscorearr)
    classmap[classid].scoreStandardDeviation = standarddeviation(classstudentscorearr)
    classmap[classid].discrimination = calcDiscrimination(classstudentscorearr)
    classmap[classid].question = Object.entries(classmap[classid].question).map(q => {
      const averagescore = average(q[1].scorelist)
      const scorestandarddeviation = standarddeviation(q[1].scorelist)
      const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
      if (q[1].option) {
        return {
          name: q[0],
          option: q[1].option,
          optionName: q[1].optionName,
          answer: questionmap[q[0]].answer,
          averageScore: averagescore,
          scoringRate: fixtwo(scoringrate),
          scoreStandardDeviation: scorestandarddeviation,
          discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
        }
      }
      if (q[1].score) {
        return {
          name: q[0],
          score: Object.entries(q[1].score).map(s => {
            return {
              score: Number(s[0]),
              student: s[1]
            }
          }).sort((a, b) => b.score - a.score),
          averageScore: averagescore,
          scoringRate: fixtwo(scoringrate),
          scoreStandardDeviation: scorestandarddeviation,
          discrimination: calcDiscrimination(q[1].scorelist, questionmap[q[0]].totalscore)
        }
      }
    })
  })
  const classreports = Object.values(classmap)
  classreports.forEach(item => {
    const n = Object.fromEntries(Object.entries(item).filter(([key]) => !['classId', 'question', 'knowledgepoint', 'student'].includes(key)))
    schoolmap[classschoolmap[item.classId]].class.push({
      id: item.classId,
      ...n
    })
  })
  const schoolreports = Object.values(schoolmap)
  jointmap.school = schoolreports.map(item => {
    const n = Object.fromEntries(Object.entries(item).filter(([key]) => !['schoolId', 'question', 'knowledgepoint', 'class', 'student'].includes(key)))
    return {
      id: item.schoolId,
      ...n
    }
  })
  return {
    joint: jointmap,
    school: schoolreports,
    class: classreports
  }
}
function getMultipleSubjectScoreReport(input) {
  const jointmap = {
    school: [],
    student: {}
  }
  const schoolmap = {}
  const classmap = {}
  input.forEach(item => {
    if (item.type == 'joint') {
      item.student.forEach(stu => {
        const studentaccount = stu.account
        delete stu.account
        if (!jointmap.student[studentaccount]) {
          jointmap.student[studentaccount] = {
            account: studentaccount,
            subject: [
              {
                name: '多学科',
                totalScoreWithExtra: 0,
                totalScoreWithoutExtra: 0,
                extraTotalScore: 0
              }
            ]
          }
        }
        jointmap.student[studentaccount].subject[0].totalScoreWithExtra += stu.totalScoreWithExtra
        if (typeof (stu.fuScore) == 'undefined') {
          jointmap.student[studentaccount].subject[0].totalScoreWithoutExtra += stu.totalScoreWithoutExtra
        }
        if (typeof (stu.fuScore) == 'number') {
          jointmap.student[studentaccount].subject[0].totalScoreWithoutExtra += stu.fuScore
        }
        jointmap.student[studentaccount].subject[0].extraTotalScore += stu.extraTotalScore
        jointmap.student[studentaccount].subject.push({
          name: item.subject,
          ...stu
        })
      })
    }
    if (item.type == 'school') {
      if (!schoolmap[item.schoolId]) {
        schoolmap[item.schoolId] = {
          schoolId: item.schoolId,
          class: item.class.map(c => c.id),
          student: {}
        }
      }
      item.student.forEach(stu => {
        const studentaccount = stu.account
        delete stu.account
        if (!schoolmap[item.schoolId].student[studentaccount]) {
          schoolmap[item.schoolId].student[studentaccount] = {
            account: studentaccount,
            subject: [
              {
                name: '多学科',
                totalScoreWithExtra: 0,
                totalScoreWithoutExtra: 0,
                extraTotalScore: 0
              }
            ]
          }
        }
        schoolmap[item.schoolId].student[studentaccount].subject[0].totalScoreWithExtra += stu.totalScoreWithExtra
        if (typeof (stu.fuScore) == 'undefined') {
          schoolmap[item.schoolId].student[studentaccount].subject[0].totalScoreWithoutExtra += stu.totalScoreWithoutExtra
        }
        if (typeof (stu.fuScore) == 'number') {
          schoolmap[item.schoolId].student[studentaccount].subject[0].totalScoreWithoutExtra += stu.fuScore
        }
        schoolmap[item.schoolId].student[studentaccount].subject[0].extraTotalScore += stu.extraTotalScore
        schoolmap[item.schoolId].student[studentaccount].subject.push({
          name: item.subject,
          ...stu
        })
      })
    }
    if (item.type == 'class') {
      if (!classmap[item.classId]) {
        classmap[item.classId] = {
          classId: item.classId,
          student: {}
        }
      }
      item.student.forEach(stu => {
        const studentaccount = stu.account
        delete stu.account
        if (!classmap[item.classId].student[studentaccount]) {
          classmap[item.classId].student[studentaccount] = {
            account: studentaccount,
            subject: [
              {
                name: '多学科',
                totalScoreWithExtra: 0,
                totalScoreWithoutExtra: 0,
                extraTotalScore: 0
              }
            ]
          }
        }
        classmap[item.classId].student[studentaccount].subject[0].totalScoreWithExtra += stu.totalScoreWithExtra
        if (typeof (stu.fuScore) == 'undefined') {
          classmap[item.classId].student[studentaccount].subject[0].totalScoreWithoutExtra += stu.totalScoreWithoutExtra
        }
        if (typeof (stu.fuScore) == 'number') {
          classmap[item.classId].student[studentaccount].subject[0].totalScoreWithoutExtra += stu.fuScore
        }
        classmap[item.classId].student[studentaccount].subject[0].extraTotalScore += stu.extraTotalScore
        classmap[item.classId].student[studentaccount].subject.push({
          name: item.subject,
          ...stu
        })
      })
    }
  })
  jointmap.student = Object.values(jointmap.student)
  jointmap.student.sort((a, b) => b.subject[0].totalScoreWithoutExtra - a.subject[0].totalScoreWithoutExtra)
  const jointrankmap = {}
  jointmap.student.forEach((item, index) => {
    if (index > 0 && item.subject[0].totalScoreWithoutExtra == jointmap.student[index - 1].subject[0].totalScoreWithoutExtra) {
      jointmap.student[index].subject[0].jointRank = jointmap.student[index - 1].subject[0].jointRank
      jointrankmap[item.account] = jointmap.student[index - 1].subject[0].jointRank
    } else {
      jointmap.student[index].subject[0].jointRank = index + 1
      jointrankmap[item.account] = index + 1
    }
  })
  const jointstudentscorearr = jointmap.student.map(item => item.subject[0].totalScoreWithoutExtra)
  jointmap.averageScore = average(jointstudentscorearr)
  jointmap.scoreStandardDeviation = standarddeviation(jointstudentscorearr)
  jointmap.discrimination = calcDiscrimination(jointstudentscorearr)
  Object.keys(schoolmap).forEach(schoolid => {
    schoolmap[schoolid].student = Object.values(schoolmap[schoolid].student)
    schoolmap[schoolid].student.sort((a, b) => b.subject[0].totalScoreWithoutExtra - a.subject[0].totalScoreWithoutExtra)
  })
  const schoolrankmap = {}
  Object.keys(schoolmap).forEach(schoolid => {
    const clonestudent = schoolmap[schoolid].student.map(s => s)
    clonestudent.forEach((item, index) => {
      item.subject[0].jointRank = jointrankmap[item.account]
      if (index > 0 && item.subject[0].totalScoreWithoutExtra == clonestudent[index - 1].subject[0].totalScoreWithoutExtra) {
        item.subject[0].schoolRank = clonestudent[index - 1].subject[0].schoolRank
        schoolrankmap[item.account] = clonestudent[index - 1].subject[0].schoolRank
      } else {
        item.subject[0].schoolRank = index + 1
        schoolrankmap[item.account] = index + 1
      }
    })
    schoolmap[schoolid].student = clonestudent
    const schoolstudentscorearr = schoolmap[schoolid].student.map(item => item.subject[0].totalScoreWithoutExtra)
    schoolmap[schoolid].averageScore = average(schoolstudentscorearr)
    schoolmap[schoolid].scoreStandardDeviation = standarddeviation(schoolstudentscorearr)
    schoolmap[schoolid].discrimination = calcDiscrimination(schoolstudentscorearr)
  })
  const schoolreports = Object.values(schoolmap)
  jointmap.school = schoolreports.map(item => {
    const n = Object.fromEntries(Object.entries(item).filter(([key]) => !['schoolId', 'question', 'student'].includes(key)))
    return {
      id: item.schoolId,
      ...n
    }
  })
  Object.keys(classmap).forEach(classid => {
    classmap[classid].student = Object.values(classmap[classid].student)
    classmap[classid].student.sort((a, b) => b.subject[0].totalScoreWithoutExtra - a.subject[0].totalScoreWithoutExtra)
  })
  Object.keys(classmap).forEach(classid => {
    const clonestudent = classmap[classid].student.map(s => s)
    clonestudent.forEach((item, index) => {
      item.subject[0].jointRank = jointrankmap[item.account]
      item.subject[0].schoolRank = schoolrankmap[item.account]
      if (index > 0 && item.subject[0].totalScoreWithoutExtra == clonestudent[index - 1].subject[0].totalScoreWithoutExtra) {
        item.subject[0].classRank = clonestudent[index - 1].subject[0].classRank
      } else {
        item.subject[0].classRank = index + 1
      }
    })
    classmap[classid].student = clonestudent
    const classstudentscorearr = classmap[classid].student.map(item => item.subject[0].totalScoreWithoutExtra)
    classmap[classid].averageScore = average(classstudentscorearr)
    classmap[classid].scoreStandardDeviation = standarddeviation(classstudentscorearr)
    classmap[classid].discrimination = calcDiscrimination(classstudentscorearr)
  })
  schoolreports.forEach(item => {
    item.class = item.class.map(classid => {
      const n = Object.fromEntries(Object.entries(classmap[classid]).filter(([key]) => !['classId', 'question', 'student'].includes(key)))
      return {
        id: classid,
        ...n
      }
    })
  })
  const classreports = Object.values(classmap)
  return {
    joint: jointmap,
    school: schoolreports,
    class: classreports
  }
}
async function generateDefaultScoreReport(exam, subject, configfilepath) {
  const crypto = require('crypto')
  const db = await (require('./db').database(configfilepath))
  const subjects = []
  subjects.push({
    name: subject.name,
    config: {
      scoreTimes: 1,
      scoringQuestionNames: subject.objectiveQuestion.map(item => item.name).concat(subject.subjectiveQuestion.map(item => item.name)),
      fuScoreRule: []
    }
  })
  if (subject.subSubject.length > 0) {
    subject.subSubject.forEach(item => {
      subjects.push({
        name: item,
        config: {
          scoreTimes: 1,
          scoringQuestionNames: subject.objectiveQuestion.filter(i => i.subject == item).map(item => item.name).concat(subject.subjectiveQuestion.filter(i => i.subject == item).map(item => item.name)),
          fuScoreRule: []
        }
      })
    })
  }
  for (let i = 0; i < subjects.length; i++) {
    const item = subjects[i]
    let scorereportconfigid = ''
    const scorereportconfig = await db.collection('scorereportconfig').findOne({
      examId: exam.examId,
      subject: item.name,
      type: 'system'
    })
    if (!scorereportconfig) {
      scorereportconfigid = crypto.randomUUID()
      await db.collection('scorereportconfig').insertOne({
        examId: exam.examId,
        subject: item.name,
        type: 'system',
        scorereportconfigId: scorereportconfigid,
        name: exam.name + '（' + item.name + '）',
        config: item.config,
        student: [],
        studentVisible: true,
        classTeacherVisible: true,
        jointVisibleAccount: [],
        schoolVisibleAccount: [],
        classVisibleAccount: [],
        status: 'pending',
        updateTime: -1
      })
    }
    if (scorereportconfig) {
      if (scorereportconfig.status == 'processing') {
        return
      }
      scorereportconfigid = scorereportconfig.scorereportconfigId
      item.config = scorereportconfig.config
    }
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfigid
    }, {
      $set: {
        status: 'processing'
      }
    })
    let classes = []
    if (!exam.schoolId) {
      classes = await db.collection('class').find({}).toArray()
    }
    if (exam.schoolId) {
      classes = await db.collection('class').find({
        schoolId: exam.schoolId
      }).toArray()
    }
    classes = classes.filter(item => subject.class.includes(item.classId))
    const marklog = await db.collection('marklog').find({
      examId: exam.examId,
      subject: subject.name,
      type: 'system',
      questionName: {
        $in: item.config.scoringQuestionNames
      }
    }).toArray()
    const scorereport = await getScoreReport(subject, classes, marklog, item.config, exam.schoolId, configfilepath)
    if (scorereportconfig && scorereportconfig.status == 'finished') {
      await db.collection('scorereport').deleteMany({
        scorereportconfigId: scorereportconfigid
      })
      await db.collection('scorereportconfig').updateOne({
        scorereportconfigId: scorereportconfigid
      }, {
        $set: {
          student: []
        }
      })
    }
    if (scorereport.joint.student.length > 0) {
      const docs = [{
        scorereportId: crypto.randomUUID(),
        scorereportconfigId: scorereportconfigid,
        examId: exam.examId,
        subject: item.name,
        createTime: Date.now(),
        type: 'joint',
        ...scorereport.joint
      }].concat(scorereport.school.map(schoolitem => ({
        scorereportId: crypto.randomUUID(),
        scorereportconfigId: scorereportconfigid,
        examId: exam.examId,
        subject: item.name,
        createTime: Date.now(),
        type: 'school',
        ...schoolitem
      }))).concat(scorereport.class.map(classitem => ({
        scorereportId: crypto.randomUUID(),
        scorereportconfigId: scorereportconfigid,
        examId: exam.examId,
        subject: item.name,
        createTime: Date.now(),
        type: 'class',
        ...classitem
      })))
      if (docs.length > 0) {
        await db.collection('scorereport').insertMany(docs, {
          ordered: false
        })
      }
      await db.collection('scorereportconfig').updateOne({
        scorereportconfigId: scorereportconfigid
      }, {
        $set: {
          student: scorereport.joint.student.map(item => item.account)
        }
      })
    }
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfigid
    }, {
      $set: {
        status: 'finished',
        updateTime: Date.now()
      }
    })
  }
}
async function generateSingleSubjectScoreReport(exam, subject, scorereportconfig, configfilepath) {
  const db = await (require('./db').database(configfilepath))
  await db.collection('scorereportconfig').updateOne({
    scorereportconfigId: scorereportconfig.scorereportconfigId
  }, {
    $set: {
      status: 'processing'
    }
  })
  let classes = []
  if (!exam.schoolId) {
    classes = await db.collection('class').find({}).toArray()
  }
  if (exam.schoolId) {
    classes = await db.collection('class').find({
      schoolId: exam.schoolId
    }).toArray()
  }
  classes = classes.filter(item => subject.class.includes(item.classId))
  const marklog = await db.collection('marklog').find({
    examId: exam.examId,
    subject: subject.name,
    type: 'system',
    questionName: {
      $in: scorereportconfig.config.scoringQuestionNames
    }
  }).toArray()
  const scorereport = await getScoreReport(subject, classes, marklog, scorereportconfig.config, exam.schoolId, configfilepath)
  if (scorereportconfig.status == 'finished') {
    await db.collection('scorereport').deleteMany({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    })
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    }, {
      $set: {
        student: []
      }
    })
  }
  if (scorereport.joint.student.length > 0) {
    const docs = [{
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: scorereportconfig.subject,
      createTime: Date.now(),
      type: 'joint',
      ...scorereport.joint
    }].concat(scorereport.school.map(schoolitem => ({
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: scorereportconfig.subject,
      createTime: Date.now(),
      type: 'school',
      ...schoolitem
    }))).concat(scorereport.class.map(classitem => ({
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: scorereportconfig.subject,
      createTime: Date.now(),
      type: 'class',
      ...classitem
    })))
    if (docs.length > 0) {
      await db.collection('scorereport').insertMany(docs, {
        ordered: false
      })
    }
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    }, {
      $set: {
        student: scorereport.joint.student.map(item => item.account)
      }
    })
  }
  await db.collection('scorereportconfig').updateOne({
    scorereportconfigId: scorereportconfig.scorereportconfigId
  }, {
    $set: {
      status: 'finished',
      updateTime: Date.now()
    }
  })
}
async function generateMultipleSubjectScoreReport(exam, scorereportconfig, configfilepath) {
  const db = await (require('./db').database(configfilepath))
  await db.collection('scorereportconfig').updateOne({
    scorereportconfigId: scorereportconfig.scorereportconfigId
  }, {
    $set: {
      status: 'processing'
    }
  })
  const scorereportres = await db.collection('scorereport').find({
    scorereportconfigId: {
      $in: scorereportconfig.scorereportconfigIdArray
    }
  }).toArray()
  scorereportres.sort((a, b) => scorereportconfig.scorereportconfigIdArray.indexOf(a.scorereportconfigId) - scorereportconfig.scorereportconfigIdArray.indexOf(b.scorereportconfigId))
  const scorereport = getMultipleSubjectScoreReport(scorereportres)
  if (scorereportconfig.status == 'finished') {
    await db.collection('scorereport').deleteMany({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    })
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    }, {
      $set: {
        student: []
      }
    })
  }
  if (scorereport.joint.student.length > 0) {
    const docs = [{
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: '多学科',
      createTime: Date.now(),
      type: 'joint',
      ...scorereport.joint
    }].concat(scorereport.school.map(item => ({
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: '多学科',
      createTime: Date.now(),
      type: 'school',
      ...item
    }))).concat(scorereport.class.map(item => ({
      scorereportId: crypto.randomUUID(),
      scorereportconfigId: scorereportconfig.scorereportconfigId,
      examId: exam.examId,
      subject: '多学科',
      createTime: Date.now(),
      type: 'class',
      ...item
    })))
    if (docs.length > 0) {
      await db.collection('scorereport').insertMany(docs, {
        ordered: false
      })
    }
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfig.scorereportconfigId
    }, {
      $set: {
        student: scorereport.joint.student.map(item => item.account)
      }
    })
  }
  await db.collection('scorereportconfig').updateOne({
    scorereportconfigId: scorereportconfig.scorereportconfigId
  }, {
    $set: {
      status: 'finished',
      updateTime: Date.now()
    }
  })
}
module.exports = {
  generateDefaultScoreReport,
  generateSingleSubjectScoreReport,
  generateMultipleSubjectScoreReport,
  calcObjectiveScore,
  sum,
  average,
  fixtwo
}