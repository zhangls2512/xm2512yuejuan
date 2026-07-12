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
    const getres = await db.collection('account').findOne({
      schoolId: account.schoolId,
      account: requestdata.account,
      type: {
        $in: ['teacher', 'student']
      }
    })
    if (!getres) {
      return {
        errCode: 400,
        errMsg: '账号不存在',
        errFix: '无修复建议'
      }
    }
    if (getres) {
      await db.collection('account').updateOne({
        schoolId: account.schoolId,
        account: requestdata.account,
        type: {
          $in: ['teacher', 'student']
        }
      }, {
        $set: {
          password: bcrypt.hashSync('12345678', 12)
        }
      })
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
  }
}