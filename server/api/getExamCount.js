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
    let count = 0
    if (account.type == 'admin') {
      count = await db.collection('exam').countDocuments({
        end: requestdata.end,
        $or: [
          {
            schoolId: account.schoolId
          },
          {
            adminAccount: account.account
          }
        ]
      })
    }
    if (account.type == 'teacher') {
      count = await db.collection('exam').countDocuments({
        adminAccount: account.account,
        end: requestdata.end
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}