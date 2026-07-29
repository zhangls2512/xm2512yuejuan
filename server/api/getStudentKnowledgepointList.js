'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { calcObjectiveScore, fixtwo, sum } = require('../util/scorereport')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type == 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const studentAccount = account.type == 'teacher' ? requestdata.studentAccount : account.account
    if (typeof (studentAccount) != 'string' || studentAccount.length != 36) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的studentAccount参数'
      }
    }
    const scorereportres = await db.collection('scorereport').findOne({
      scorereportId: requestdata.id
    })
    if (!scorereportres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
        errFix: '无修复建议'
      }
    }
    if (!scorereportres.student.map(item => item.account).includes(studentAccount)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: scorereportres.scorereportconfigId,
      status: 'finished',
      subject: {
        $ne: '多学科'
      }
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
        errFix: '无修复建议'
      }
    }
    let access = false
    if (account.type == 'student' && scorereportconfigres.studentVisible) {
      access = true
    }
    if (account.type == 'teacher') {
      if (scorereportres.type == 'class' && scorereportconfigres.classTeacherVisible) {
        access = true
      }
      if (scorereportres.type == 'joint' && scorereportconfigres.jointVisibleAccount.includes(account.account)) {
        access = true
      }
      if (scorereportres.type == 'school' && scorereportconfigres.schoolVisibleAccount.includes(account.account)) {
        access = true
      }
    }
    const classaccess = scorereportconfigres.classVisibleAccount.includes(account.account)
    if (scorereportres.type == 'class' && classaccess) {
      access = true
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (account.schoolId && scorereportres.type != 'joint') {
      if (scorereportres.type == 'school' && scorereportres.schoolId != account.schoolId) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (scorereportres.type == 'class') {
        const classres = await db.collection('class').findOne({
          classId: scorereportres.classId
        })
        if (!classres) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (classres.schoolId != account.schoolId) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (!classaccess) {
          const teachers = classres.subject.find(s => s.name == scorereportconfigres.subject)
          if (!teachers || !teachers.teacher.includes(account.account)) {
            return {
              errCode: 403,
              errMsg: '无权限',
              errFix: '无修复建议'
            }
          }
        }
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: scorereportconfigres.examId,
      $or: [
        {
          name: scorereportconfigres.subject
        },
        {
          subSubject: scorereportconfigres.subject
        }
      ]
    })
    const exam = await db.collection('exam').findOne({
      examId: scorereportconfigres.examId
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    const marklogres = await db.collection('marklog').find({
      examId: scorereportconfigres.examId,
      subject: examsubjectgetres.name,
      studentAccount: studentAccount,
      questionName: {
        $in: scorereportconfigres.config.scoringQuestionNames
      },
      type: 'system'
    }).toArray()
    const questions = examsubjectgetres.objectiveQuestion.concat(examsubjectgetres.subjectiveQuestion)
    const questionmap = {}
    questions.forEach(item => {
      questionmap[item.name] = item
    })
    const questionnames = questions.filter(item => item.questionId)
    const marklogquestionids = marklogres.map(item => questionmap[item.questionName].questionId).filter(item => item)
    const questionidknowledgepointmap = {}
    const qa = await db.collection('question').find({
      questionId: {
        $in: [...new Set(marklogquestionids)]
      },
      schoolId: exam.schoolId
    }).toArray()
    qa.forEach(item => {
      questionidknowledgepointmap[item.questionId] = item.knowledgepoint
    })
    const knowledgepointmap = {}
    marklogres.forEach(item => {
      const question = questionmap[item.questionName]
      const knowledgepoint = questionidknowledgepointmap[question.questionId]
      if (knowledgepoint) {
        knowledgepoint.forEach(k => {
          if (!knowledgepointmap[k]) {
            knowledgepointmap[k] = {
              name: k,
              questionName: [],
              score: 0,
              fullscore: 0
            }
          }
          knowledgepointmap[k].questionName.push(item.questionName)
          knowledgepointmap[k].score += item.answer ? calcObjectiveScore(question, item.answer) : item.finalTotalScore
          knowledgepointmap[k].fullscore += item.answer ? Math.max(...[...new Set(question.correctOptionCountRule.map(r => r.score).concat(question.specialOptionGroupRule.map(r => r.score)))]) : sum(question.stepScore.map(s => s[0]))
        })
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: Object.values(knowledgepointmap).map(item => {
        return {
          name: item.name,
          questionName: item.questionName,
          scoringRate: fixtwo((item.score / item.fullscore) * 100)
        }
      })
    }
  }
}