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
    const findres = await db.collection('class').findOne({
      classId: requestdata.id,
      schoolId: account.schoolId
    })
    if (!findres) {
      return {
        errCode: 400,
        errMsg: '班级不存在',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      class: requestdata.id
    })
    if (examsubjectres) {
      return {
        errCode: 400,
        errMsg: '已绑定考试科目',
        errFix: '无修复建议'
      }
    }
    const scorereportres = await db.collection('scorereport').findOne({
      classId: requestdata.id,
      type: 'class'
    })
    if (scorereportres) {
      return {
        errCode: 400,
        errMsg: '存在成绩报告',
        errFix: '无修复建议'
      }
    }
    await db.collection('class').deleteOne({
      classId: requestdata.id,
      schoolId: account.schoolId
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}