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
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (!['paused', 'processing', 'end'].includes(requestdata.markStatus)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的markStatus参数'
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
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (examgetres.end) {
      return {
        errCode: 400,
        errMsg: '考试已结束',
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
      if (adminexist && !adminexist.permission.includes('updateMarkStatus')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const allowstatus = {
      paused: ['processing'],
      processing: ['paused', 'end'],
      end: ['paused']
    }
    if (!allowstatus[examsubjectgetres.markStatus].includes(requestdata.markStatus)) {
      return {
        errCode: 400,
        errMsg: '不可修改为该状态',
        errFix: '无修复建议'
      }
    }
    if (requestdata.markStatus == 'end' && examsubjectgetres.answerOnline && examsubjectgetres.endTime >= Date.now()) {
      return {
        errCode: 400,
        errMsg: '作答未结束',
        errFix: '无修复建议'
      }
    }
    await db.collection('examsubject').updateOne({
      examId: requestdata.id,
      name: requestdata.name
    }, {
      $set: {
        markStatus: requestdata.markStatus
      }
    })
    if (requestdata.markStatus == 'end') {
      require('../util/scorereport').generateDefaultScoreReport(examgetres, examsubjectgetres, configfilepath)
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}