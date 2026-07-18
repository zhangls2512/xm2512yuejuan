function sum(arr) {
  return arr.reduce((sum, num) => sum + num, 0)
}
function average(arr) {
  if (arr.length == 0) {
    return 0
  }
  return fixtwo((arr.reduce((a, b) => a + b, 0) / arr.length))
}
function standarddeviation(arr) {
  if (arr.length == 0) {
    return 0
  }
  return fixtwo(Math.sqrt(arr.reduce((s, x) => s + (x - average(arr)) ** 2, 0) / arr.length))
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
      level: levels[levelindex].name
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
function getScoreReport(subject, classes, marklog, config) {
  const questionmap = {}
  subject.objectiveQuestion.forEach(i => {
    if (config.scoringQuestionNames.includes(i.name)) {
      questionmap[i.name] = {
        objective: true,
        extra: i.extra,
        totalscore: Math.max(...[...new Set(i.correctOptionCountRule.map(item => item.score).concat(i.specialOptionGroupRule.map(item => item.score)))]),
        rule: i
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
  const studentmap = {}
  const jointmap = {
    question: {},
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
          studentAccount: r.studentAccount,
          totalScoreWithExtra: 0,
          totalScoreWithoutExtra: 0,
          extraTotalScore: 0
        }
      }
      if (!jointmap.question[r.questionName]) {
        if (questioninfo.objective) {
          jointmap.question[r.questionName] = {
            option: Array.from({ length: questioninfo.rule.option.length }, () => []),
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
            student: []
          }
        }
        if (!schoolmap[studentinfo.schoolId].question[r.questionName]) {
          if (questioninfo.objective) {
            schoolmap[studentinfo.schoolId].question[r.questionName] = {
              option: Array.from({ length: questioninfo.rule.option.length }, () => []),
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
      }
      studentinfo.classId.forEach(classid => {
        if (!classmap[classid]) {
          classmap[classid] = {
            classId: classid,
            question: {},
            student: []
          }
        }
        if (!classmap[classid].question[r.questionName]) {
          if (questioninfo.objective) {
            classmap[classid].question[r.questionName] = {
              option: Array.from({ length: questioninfo.rule.option.length }, () => []),
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
      })
    }
  })
  jointmap.student = Object.values(jointmap.student)
  if (config.fuScoreRules.length > 0) {
    const ff = generateGradedReport(jointmap.student.map(item => item.totalScoreWithoutExtra), config.fuScoreRules)
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
  const sortkey = config.fuScoreRules.length > 0 ? 'fuScore' : 'totalScoreWithoutExtra'
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
  const jointstudentscorearr = jointmap.student.map(item => config.fuScoreRules.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
  jointmap.averageScore = average(jointstudentscorearr)
  jointmap.scoreStandardDeviation = standarddeviation(jointstudentscorearr)
  jointmap.question = Object.entries(jointmap.question).map(q => {
    const averagescore = average(q[1].scorelist)
    const scorestandarddeviation = standarddeviation(q[1].scorelist)
    const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
    if (q[1].option) {
      return {
        questionName: q[0],
        option: q[1].option,
        averageScore: averagescore,
        scoringRate: scoringrate,
        scoreStandardDeviation: scorestandarddeviation
      }
    }
    if (q[1].score) {
      return {
        questionName: q[0],
        score: Object.entries(q[1].score).map(s => {
          return {
            score: Number(s[0]),
            student: s[1]
          }
        }),
        averageScore: averagescore,
        scoringRate: scoringrate,
        scoreStandardDeviation: scorestandarddeviation
      }
    }
  })
  jointmap.student.forEach(item => {
    const studentinfo = studentmap[item.studentAccount]
    if (studentinfo.schoolId) {
      schoolmap[studentinfo.schoolId].student.push(item)
    }
    studentinfo.classId.forEach(classid => {
      classmap[classid].student.push(item)
    })
  })
  Object.keys(schoolmap).forEach(schoolid => {
    const clonestudent = schoolmap[schoolid].student.map(s => ({
      ...s,
      schoolRank: undefined
    }))
    clonestudent.forEach((item, index) => {
      if (index > 0 && item[sortkey] === clonestudent[index - 1][sortkey]) {
        item.schoolRank = clonestudent[index - 1].schoolRank
      } else {
        item.schoolRank = index + 1
      }
    })
    schoolmap[schoolid].student = clonestudent
    const schoolstudentscorearr = schoolmap[schoolid].student.map(item => config.fuScoreRules.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
    schoolmap[schoolid].averageScore = average(schoolstudentscorearr)
    schoolmap[schoolid].scoreStandardDeviation = standarddeviation(schoolstudentscorearr)
    schoolmap[schoolid].question = Object.entries(schoolmap[schoolid].question).map(q => {
      const averagescore = average(q[1].scorelist)
      const scorestandarddeviation = standarddeviation(q[1].scorelist)
      const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
      if (q[1].option) {
        return {
          questionName: q[0],
          option: q[1].option,
          averageScore: averagescore,
          scoringRate: scoringrate,
          scoreStandardDeviation: scorestandarddeviation
        }
      }
      if (q[1].score) {
        return {
          questionName: q[0],
          score: Object.entries(q[1].score).map(s => {
            return {
              score: Number(s[0]),
              student: s[1]
            }
          }),
          averageScore: averagescore,
          scoringRate: scoringrate,
          scoreStandardDeviation: scorestandarddeviation
        }
      }
    })
  })
  const schoolreports = Object.values(schoolmap)
  Object.keys(classmap).forEach(classid => {
    const clonestudent = classmap[classid].student.map(s => ({
      ...s,
      classRank: undefined
    }))
    clonestudent.forEach((item, index) => {
      if (index > 0 && item[sortkey] === clonestudent[index - 1][sortkey]) {
        item.classRank = clonestudent[index - 1].classRank
      } else {
        item.classRank = index + 1
      }
    })
    classmap[classid].student = clonestudent
    const classstudentscorearr = classmap[classid].student.map(item => config.fuScoreRules.length > 0 ? item.fuScore : item.totalScoreWithoutExtra)
    classmap[classid].averageScore = average(classstudentscorearr)
    classmap[classid].scoreStandardDeviation = standarddeviation(classstudentscorearr)
    classmap[classid].question = Object.entries(classmap[classid].question).map(q => {
      const averagescore = average(q[1].scorelist)
      const scorestandarddeviation = standarddeviation(q[1].scorelist)
      const scoringrate = (averagescore / questionmap[q[0]].totalscore) * 100
      if (q[1].option) {
        return {
          questionName: q[0],
          option: q[1].option,
          averageScore: averagescore,
          scoringRate: scoringrate,
          scoreStandardDeviation: scorestandarddeviation
        }
      }
      if (q[1].score) {
        return {
          questionName: q[0],
          score: Object.entries(q[1].score).map(s => {
            return {
              score: Number(s[0]),
              student: s[1]
            }
          }),
          averageScore: averagescore,
          scoringRate: scoringrate,
          scoreStandardDeviation: scorestandarddeviation
        }
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
      fuScoreRules: []
    }
  })
  if (subject.subSubject.length > 0) {
    subject.subSubject.forEach(item => {
      subjects.push({
        name: item,
        config: {
          scoreTimes: 1,
          scoringQuestionNames: subject.objectiveQuestion.filter(i => i.subject == item).map(item => item.name).concat(subject.subjectiveQuestion.filter(i => i.subject == item).map(item => item.name)),
          fuScoreRules: []
        }
      })
    })
  }
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
    type: 'system'
  }).toArray()
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
        config: item.config,
        studentVisible: true,
        classTeacherVisible: true,
        jointVisibleAccount: [],
        schoolVisibleAccount: [],
        classVisibleAccount: []
      })
    }
    if (scorereportconfig) {
      scorereportconfigid = scorereportconfig.scorereportconfigId
    }
    const scorereport = getScoreReport(subject, classes, marklog, item.config)
    await db.collection('scorereport').deleteMany({
      scorereportconfigId: scorereportconfigid
    })
    await db.collection('scorereport').insertOne({
      scorereportconfigId: scorereportconfigid,
      type: 'joint',
      question: scorereport.joint.question,
      student: scorereport.joint.student,
      averageScore: scorereport.joint.averageScore,
      scoreStandardDeviation: scorereport.joint.scoreStandardDeviation
    })
    await db.collection('scorereportconfig').updateOne({
      scorereportconfigId: scorereportconfigid
    }, {
      $set: {
        student: scorereport.joint.student.map(item => item.studentAccount)
      }
    })
    for (let j = 0; j < scorereport.school.length; j++) {
      const school = scorereport.school[j]
      await db.collection('scorereport').insertOne({
        scorereportconfigId: scorereportconfigid,
        type: 'school',
        schoolId: school.schoolId,
        question: school.question,
        student: school.student,
        averageScore: school.averageScore,
        scoreStandardDeviation: school.scoreStandardDeviation
      })
    }
    for (let j = 0; j < scorereport.class.length; j++) {
      const classitem = scorereport.class[j]
      await db.collection('scorereport').insertOne({
        scorereportconfigId: scorereportconfigid,
        type: 'class',
        classId: classitem.classId,
        question: classitem.question,
        student: classitem.student,
        averageScore: classitem.averageScore,
        scoreStandardDeviation: classitem.scoreStandardDeviation
      })
    }
  }
}
module.exports = {
  generateDefaultScoreReport
}