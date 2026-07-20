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
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examgetres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    if (!examsubjectgetres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (examsubjectgetres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
      const adminexist = examsubjectgetres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('manageAnswer')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      examId: requestdata.id,
      subject: {
        $in: examsubjectgetres.name.concat(examsubjectgetres.subSubject)
      },
      student: requestdata.studentAccount
    })
    if (scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '已生成成绩报告',
        errFix: '无修复建议'
      }
    }
    const deleteres = await db.collection('answer').deleteOne({
      examId: requestdata.id,
      subject: requestdata.subject,
      studentAccount: requestdata.studentAccount
    })
    if (deleteres.deletedCount != 0) {
      if (!examsubjectgetres.answerOnline || (examsubjectgetres.answerOnline && examsubjectgetres.markGroup.length > 0)) {
        const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject
        rmdir(rootdir + '/answer/' + requestdata.studentAccount)
        rmdir(rootdir + '/marktraceimage/' + requestdata.studentAccount)
      }
      await db.collection('marklog').deleteMany({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: requestdata.studentAccount
      })
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (deleteres.deletedCount == 0) {
      return {
        errCode: 400,
        errMsg: '作答不存在',
        errFix: '无修复建议'
      }
    }
  }
}