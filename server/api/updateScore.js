'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { sum } = require('../util/scorereport')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  if (typeof (requestdata.studentAccount) != 'string' || requestdata.studentAccount.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的studentAccount参数'
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
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    if (!examsubjectres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (examsubjectres.markStatus != 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷未结束',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
      const adminexist = examsubjectres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('updateScore')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      examId: requestdata.id,
      subject: requestdata.subject,
      studentAccount: requestdata.studentAccount,
      questionName: requestdata.questionName,
      type: 'system'
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '阅卷记录不存在',
        errFix: '无修复建议'
      }
    }
    if (marklogres.answer) {
      const question = examsubjectres.objectiveQuestion.find(q => q.name == requestdata.questionName)
      if (!Array.isArray(requestdata.answer) || !requestdata.answer.every(item => question.option[item])) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的answer参数'
        }
      }
      await db.collection('marklog').updateOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: requestdata.studentAccount,
        questionName: requestdata.questionName,
        type: 'system'
      }, {
        $set: {
          answer: [...new Set(requestdata.answer)].sort((a, b) => a - b)
        }
      })
    } else {
      if (!Array.isArray(requestdata.stepScore) || !requestdata.stepScore.every(item => typeof (item) == 'number' && item >= 0)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的stepScore参数'
        }
      }
      const question = examsubjectres.subjectiveQuestion.find(q => q.name == requestdata.questionName)
      if (requestdata.stepScore.length != question.stepScore.length || !requestdata.stepScore.every((item, index) => question.stepScore[index].includes(item))) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的stepScore参数'
        }
      }
      const totalscore = sum(requestdata.stepScore)
      const markres = await db.collection('marklog').findOne({
        marklogId: marklogres.marklogId,
        type: 'update'
      })
      if (!markres) {
        await db.collection('marklog').insertOne({
          marklogId: marklogres.marklogId,
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: requestdata.studentAccount,
          questionName: requestdata.questionName,
          markerAccount: account.account,
          excellent: false,
          typicalMistake: false,
          type: 'update',
          stepScore: requestdata.stepScore,
          totalScore: totalscore
        })
      }
      if (markres) {
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'update'
        }, {
          $set: {
            markerAccount: account.account,
            type: 'update',
            stepScore: requestdata.stepScore,
            totalScore: totalscore
          }
        })
      }
      await db.collection('marklog').updateOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: requestdata.studentAccount,
        questionName: requestdata.questionName,
        type: 'system'
      }, {
        $set: {
          updateMarkerAccount: account.account,
          updateMarkStepScore: requestdata.stepScore,
          finalStepScore: requestdata.stepScore,
          finalTotalScore: totalscore
        }
      })
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}