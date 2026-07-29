'use strict'
exports.main = async (event, configfilepath) => {
  const { getScoreList, supplyScore } = require('../util/supplyscore')
  const db = await (require('../util/db').database(configfilepath))
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
  if (typeof (requestdata.csv) != 'string' || !requestdata.csv) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的csv参数'
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
      name: requestdata.subject
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
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
      const adminexist = examsubjectgetres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('supplyScore')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    if (examsubjectgetres.answerOnline && examsubjectgetres.endTime >= Date.now()) {
      return {
        errCode: 400,
        errMsg: '作答未结束',
        errFix: '无修复建议'
      }
    }
    const scorelist = getScoreList(examsubjectgetres, requestdata.csv)
    if (!scorelist) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的csv参数'
      }
    }
    supplyScore(scorelist, examsubjectgetres, examgetres, account.account, configfilepath)
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}