'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.end) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的end参数'
    }
  }
  let markstatus = 'end'
  if (!requestdata.end) {
    markstatus = {
      $ne: 'end'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'teacher') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const count = await db.collection('examsubject').countDocuments({
      adminAccount: account.account,
      markStatus: markstatus
    })
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}