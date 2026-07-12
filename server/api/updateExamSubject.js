'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.name) != 'string' || !requestdata.name || requestdata.name.includes('/') || requestdata.name.length > 255) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
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
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examgetres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (examgetres.schoolId && account.schoolId != examgetres.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (examgetres.end) {
      return {
        errCode: 400,
        errMsg: '考试已结束',
        errFix: '无修复建议'
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.name
    })
    if (!examsubjectgetres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
      const adminexist = examsubjectgetres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('updateConfig')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    if (examsubjectgetres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    const answerres = await db.collection('answer').findOne({
      examId: requestdata.id,
      subject: requestdata.name
    })
    const olddata = answerres ? examsubjectgetres : undefined
    const checkres = require('../util/checksubjectconfig').checkSubjectConfig(requestdata, olddata)
    if (checkres.errCode != 0) {
      return checkres
    } else {
      if (!checkres.data.answerOnline) {
        await db.collection('examsubject').updateOne({
          examId: requestdata.id,
          name: requestdata.name
        }, {
          $set: {
            class: checkres.data.class,
            subSubject: checkres.data.subSubject,
            answerOnline: false,
            admin: checkres.data.admin,
            adminAccount: checkres.data.adminAccount,
            objectiveQuestion: checkres.data.objectiveQuestion,
            subjectiveQuestion: checkres.data.subjectiveQuestion,
            markGroup: checkres.data.markGroup,
            volume: checkres.data.volume
          }
        })
      }
      if (checkres.data.answerOnline) {
        await db.collection('examsubject').updateOne({
          examId: requestdata.id,
          name: requestdata.name
        }, {
          $set: {
            class: checkres.data.class,
            subSubject: checkres.data.subSubject,
            answerOnline: true,
            startTime: checkres.data.startTime,
            endTime: checkres.data.endTime,
            admin: checkres.data.admin,
            adminAccount: checkres.data.adminAccount,
            objectiveQuestion: checkres.data.objectiveQuestion,
            subjectiveQuestion: checkres.data.subjectiveQuestion,
            markGroup: checkres.data.markGroup,
            volume: checkres.data.volume
          }
        })
      }
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}