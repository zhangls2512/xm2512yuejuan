'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'admin' || !account.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const getres = await db.collection('class').findOne({
      classId: requestdata.id,
      schoolId: account.schoolId
    }, {
      projection: {
        _id: false,
        classId: true,
        name: true,
        student: true,
        subject: true
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: getres ? [getres] : []
    }
  }
}