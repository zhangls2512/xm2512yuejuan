'use strict'
exports.main = async (event, configfilepath) => {
  const fs = require('fs')
  const { read } = require('../../util/file')
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
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  if (typeof (requestdata.studentAccount) != 'string' || requestdata.studentAccount.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的studentAccount参数'
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
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    if (!examsubjectres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    if (!(account.type == 'admin' && account.schoolId == examres.schoolId)) {
      const adminexist = examsubjectres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('manageAnswer') && !adminexist.permission.includes('checkObjectiveQuestionMarklog')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const data = await db.collection('answer').findOne({
      examId: requestdata.id,
      subject: requestdata.subject,
      studentAccount: requestdata.studentAccount
    })
    if (!data) {
      return {
        errCode: 400,
        errMsg: '作答不存在',
        errFix: '无修复建议'
      }
    }
    const result = []
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + requestdata.studentAccount + '/'
    if (fs.existsSync(rootdir)) {
      const filenames = fs.readdirSync(rootdir)
      filenames.forEach(item => {
        result.push(read(rootdir + item))
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}