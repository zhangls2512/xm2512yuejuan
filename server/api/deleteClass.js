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
    const deleteres = await db.collection('class').deleteOne({
      schoolId: account.schoolId,
      classId: requestdata.id
    })
    if (deleteres.deletedCount != 0) {
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (deleteres.deletedCount == 0) {
      return {
        errCode: 400,
        errMsg: '班级不存在',
        errFix: '无修复建议'
      }
    }
  }
}