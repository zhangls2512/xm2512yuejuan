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
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
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
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (requestdata.subject == '多学科') {
      const admin = examres.admin.find(item => item.account == account.account)
      if (!admin && (account.type != 'admin' || account.schoolId != examres.schoolId)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (admin && !admin.permission.includes('manageScorereportconfig')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    let count = 0
    if (requestdata.subject != '多学科') {
      if (!examsubjectres) {
        return {
          errCode: 400,
          errMsg: '科目不存在',
          errFix: '无修复建议'
        }
      }
      if (!(account.type == 'admin' && account.schoolId == examres.schoolId)) {
        const adminexist = examsubjectres.admin.find(item => item.account == account.account)
        if (!adminexist) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (adminexist && !adminexist.permission.includes('manageScorereportconfig')) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
      }
      count = await db.collection('scorereportconfig').countDocuments({
        examId: requestdata.id,
        subject: {
          $in: [requestdata.subject].concat(examsubjectres.subSubject)
        }
      })
    }
    if (requestdata.subject == '多学科') {
      count = await db.collection('scorereportconfig').countDocuments({
        examId: requestdata.id,
        subject: '多学科'
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}