'use strict'
exports.main = async (headers, configfilepath) => {
  const bcrypt = require('bcrypt')
  const db = await (require('./db').database(configfilepath))
  const authorization = headers.authorization
  if (typeof (authorization) != 'string' || !authorization) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  if (!authorization.startsWith('Basic ')) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  function stringsplit(str, sep, num) {
    const origin = str.split(sep)
    if (origin.length <= num) {
      return origin
    } else {
      return origin.slice(0, num - 1).concat(origin.slice(num - 1).join(sep))
    }
  }
  const info = stringsplit(Buffer.from(authorization.replace('Basic ', ''), 'base64').toString(), ':', 2)
  if (info.length != 2) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  if (info[0].length != 36 || info[1].length < 8 || info[1].length > 32) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  const account = await db.collection('account').findOne({
    account: info[0]
  })
  if (!account) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  if (!bcrypt.compareSync(info[1], account.password)) {
    return {
      errCode: 401,
      errMsg: '账号密码错误',
      errFix: '无修复建议'
    }
  }
  return {
    errCode: 0,
    errMsg: '成功',
    account: account
  }
}