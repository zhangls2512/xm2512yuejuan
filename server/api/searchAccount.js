'use strict'
exports.main = async (event, configfilepath) => {
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
    if (!account.schoolId && requestdata.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const getres = await db.collection('account').find({
      schoolId: account.schoolId,
      account: requestdata.account,
      type: requestdata.type
    }, {
      projection: {
        _id: false,
        account: true,
        type: true,
        name: true
      }
    }).toArray()
    return {
      errCode: 0,
      errMsg: '成功',
      data: getres
    }
  }
}