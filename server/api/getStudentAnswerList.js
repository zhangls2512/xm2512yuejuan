'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { calcObjectiveScore, sum } = require('../util/scorereport')
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
    const result = []
    marklogres.forEach(item => {
      const question = questions.find(i => i.name == item.questionName)
      if (question.correctOptionIndex) {
        result.push({
          questionName: item.questionName,
          answer: item.answer.length > 0 ? item.answer.map(i => question.option[i]).join('') : '未选',
          correctAnswer: question.correctOptionIndex.length > 0 ? question.correctOptionIndex.map(i => question.option[i]).join('') : '未选',
          score: calcObjectiveScore(question, item.answer),
          totalScore: Math.max(...[...new Set(question.correctOptionCountRule.map(item => item.score).concat(question.specialOptionGroupRule.map(item => item.score)))])
        })
      } else {
        result.push({
          questionName: item.questionName,
          answer: '',
          correctAnswer: '',
          score: item.finalTotalScore,
          totalScore: sum(question.stepScore.map(i => i[0]))
        })
      }
    })
    const allquestionnames = questions.map(item => item.name)
    return {
      errCode: 0,
      errMsg: '成功',
      data: result.sort((a, b) => allquestionnames.indexOf(a.questionName) - allquestionnames.indexOf(b.questionName))
    }
  }
}