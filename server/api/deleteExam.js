'use strict'
exports.main = async (event, configfilepath) => {
  const { rmdir } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
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
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    const admin = examres.admin.find(item => item.account == account.account)
    if (!admin && (account.type != 'admin' || account.schoolId != examres.schoolId)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (admin && !admin.permission.includes('delete')) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false
      }
    })
    if (examsubjectres) {
      return {
        errCode: 400,
        errMsg: '科目未清空',
        errFix: '无修复建议'
      }
    }
    await db.collection('exam').deleteOne({
      examId: requestdata.id
    })
    rmdir(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id)
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}