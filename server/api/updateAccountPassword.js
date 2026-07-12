'use strict'
exports.main = async (event, configfilepath) => {
  const bcrypt = require('bcrypt')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.password) != 'string') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的password参数'
    }
  }
  if (requestdata.password && (requestdata.password.length < 8 || requestdata.password.length > 32)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的password参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    await db.collection('account').updateOne({
      account: account.account
    }, {
      $set: {
        password: bcrypt.hashSync(requestdata.password, 12)
      }
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}