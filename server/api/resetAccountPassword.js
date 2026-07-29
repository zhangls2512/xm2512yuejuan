'use strict'
exports.main = async (event, configfilepath) => {
  const bcrypt = require('bcrypt')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.account) != 'string' || requestdata.account.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的account参数'
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
    const updateres = await db.collection('account').updateOne({
      account: requestdata.account,
      schoolId: account.schoolId,
      type: {
        $in: ['teacher', 'student']
      }
    }, {
      $set: {
        password: bcrypt.hashSync('12345678', 12)
      }
    })
    if (updateres.matchedCount != 0) {
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (updateres.matchedCount == 0) {
      return {
        errCode: 400,
        errMsg: '账号不存在',
        errFix: '无修复建议'
      }
    }
  }
}