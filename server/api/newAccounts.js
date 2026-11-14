'use strict'
exports.main = async (event, configfilepath) => {
  const bcrypt = require('bcrypt')
  const crypto = require('crypto')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (!Array.isArray(requestdata.list)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的list参数'
    }
  }
  let accounts = []
  const validtypes = ['teacher', 'student']
  for (let i = 0; i < requestdata.list.length; i++) {
    const item = requestdata.list[i]
    if (!validtypes.includes(item.type)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的list参数'
      }
    }
    if (typeof (item.name) != 'string' || !item.name) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的list参数'
      }
    }
    accounts.push({
      name: item.name,
      type: item.type
    })
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
    if (!account.schoolId) {
      accounts = accounts.filter(item => item.type == 'teacher')
    }
    if (accounts.length > 0) {
      const password = bcrypt.hashSync('12345678', 12)
      accounts.forEach(item => {
        item.schoolId = account.schoolId
        item.account = crypto.randomUUID()
        item.password = password
      })
      await db.collection('account').insertMany(accounts, {
        ordered: false
      })
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}