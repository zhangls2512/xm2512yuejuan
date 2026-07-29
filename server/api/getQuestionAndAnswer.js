'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.questionName) != 'string' || !requestdata.questionName) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的questionName参数'
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
    if (!scorereportconfigres.config.scoringQuestionNames.includes(requestdata.questionName)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的questionName参数'
      }
    }
    let access = false
    if (account.type == 'student' && scorereportconfigres.studentVisible && scorereportconfigres.student.includes(account.account)) {
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
    const questions = examsubjectgetres.objectiveQuestion.concat(examsubjectgetres.subjectiveQuestion)
    const question = questions.find(item => item.name == requestdata.questionName)
    if (!question.questionId) {
      return {
        errCode: 400,
        errMsg: '未绑定题目',
        errFix: '无修复建议'
      }
    }
    if (question.questionId) {
      const exam = await db.collection('exam').findOne({
        examId: scorereportconfigres.examId
      }, {
        projection: {
          _id: false,
          schoolId: true
        }
      })
      const qa = await db.collection('question').findOne({
        questionId: question.questionId,
        schoolId: exam.schoolId
      })
      if (!qa) {
        return {
          errCode: 400,
          errMsg: '未绑定题目',
          errFix: '无修复建议'
        }
      }
      if (qa) {
        const dir = readConfig(configfilepath, 'dataRootPath') + '/question/' + question.questionId + '-'
        return {
          errCode: 0,
          errMsg: '成功',
          data: {
            question: read(dir + 'question'),
            answer: read(dir + 'answer'),
            difficulty: qa.difficulty,
            knowledgepoint: qa.knowledgepoint
          }
        }
      }
    }
  }
}