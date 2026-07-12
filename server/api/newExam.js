'use strict'
exports.main = async (event, configfilepath) => {
  const crypto = require('crypto')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (typeof (requestdata.type) != 'string' || !requestdata.type) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
    }
  }
  if (!Number.isInteger(requestdata.time) || requestdata.time < 0) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的time参数'
    }
  }
  if (!Array.isArray(requestdata.admin)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的admin参数'
    }
  }
  const admin = []
  const adminaccount = []
  const validpermissions = ['endExam', 'restartExam', 'updateExam', 'deleteExam', 'newSubject', 'deleteSubject']
  for (let i = 0; i < requestdata.admin.length; i++) {
    const item = requestdata.admin[i]
    if (typeof (item.account) != 'string' || item.account.length != 36 || !Array.isArray(item.permission) || !item.permission.every(p => validpermissions.includes(p))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的admin参数'
      }
    }
    if (!adminaccount.includes(item.account)) {
      admin.push({
        account: item.account,
        permission: [...new Set(item.permission)]
      })
      adminaccount.push(item.account)
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    await db.collection('exam').insertOne({
      schoolId: account.schoolId,
      examId: crypto.randomUUID(),
      name: requestdata.name,
      type: requestdata.type,
      time: requestdata.time,
      admin: admin,
      adminAccount: adminaccount,
      end: false
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}