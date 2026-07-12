'use strict'
exports.main = async (event, configfilepath) => {
  const bcrypt = require('bcrypt')
  const crypto = require('crypto')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  const validtypes = ['teacher', 'student']
  if (!validtypes.includes(requestdata.type)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
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
    if (account.type != 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (!account.schoolId && requestdata.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    await db.collection('account').insertOne({
      schoolId: account.schoolId,
      account: crypto.randomUUID(),
      password: bcrypt.hashSync('12345678', 12),
      name: requestdata.name,
      type: requestdata.type
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}