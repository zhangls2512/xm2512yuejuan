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
      name: requestdata.name
    })
    if (!examsubjectres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    let access = false
    if (account.type == 'admin' && account.schoolId == examres.schoolId) {
      access = true
    }
    if (examres.admin.find(item => item.account == account.account)) {
      access = true
    }
    if (examsubjectres.admin.find(item => item.account == account.account)) {
      access = true
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const classmap = {}
    const classres = await db.collection('class').find({
      classId: {
        $in: examsubjectres.class
      }
    }).toArray()
    classres.forEach(item => {
      classmap[item.classId] = item.name
    })
    const accountmap = {}
    const accountres = await db.collection('account').find({
      account: {
        $in: examsubjectres.adminAccount
      }
    }).toArray()
    accountres.forEach(item => {
      accountmap[item.account] = item.name
    })
    return {
      errCode: 0,
      errMsg: '成功',
      class: classmap,
      account: accountmap
    }
  }
}