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
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
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
      name: requestdata.name
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
    })
    if (!(account.type == 'admin' && account.schoolId == examres.schoolId)) {
      const adminexist = examres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('manageSubject')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    if (examres.end) {
      return {
        errCode: 400,
        errMsg: '考试已结束',
        errFix: '无修复建议'
      }
    }
    const answerres = await db.collection('answer').findOne({
      examId: requestdata.id,
      subject: requestdata.name
    }, {
      projection: {
        _id: false
      }
    })
    if (answerres) {
      return {
        errCode: 400,
        errMsg: '存在作答记录',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      examId: requestdata.id,
      subject: requestdata.name
    }, {
      projection: {
        _id: false
      }
    })
    if (marklogres) {
      return {
        errCode: 400,
        errMsg: '存在阅卷记录',
        errFix: '无修复建议'
      }
    }
    const scorereportres = await db.collection('scorereportconfig').findOne({
      examId: requestdata.id,
      subject: {
        $in: [examsubjectres.name].concat(examsubjectres.subSubject)
      }
    }, {
      projection: {
        _id: false
      }
    })
    if (scorereportres) {
      return {
        errCode: 400,
        errMsg: '存在成绩报告',
        errFix: '无修复建议'
      }
    }
    await db.collection('examsubject').deleteOne({
      examId: requestdata.id,
      name: requestdata.name
    })
    rmdir(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.name)
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}