'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
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
    const findres = await db.collection('account').findOne({
      account: requestdata.account,
      schoolId: account.schoolId,
      type: {
        $in: ['teacher', 'student']
      }
    })
    if (!findres) {
      return {
        errCode: 400,
        errMsg: '账号不存在',
        errFix: '无修复建议'
      }
    }
    if (findres.type == 'teacher') {
      const classres = await db.collection('class').findOne({
        teacherAccount: requestdata.account
      })
      if (classres) {
        return {
          errCode: 400,
          errMsg: '已绑定班级',
          errFix: '无修复建议'
        }
      }
      const examres = await db.collection('exam').findOne({
        adminAccount: requestdata.account
      })
      if (examres) {
        return {
          errCode: 400,
          errMsg: '已绑定考试',
          errFix: '无修复建议'
        }
      }
      const examsubjectres = await db.collection('examsubject').findOne({
        adminAccount: requestdata.account
      })
      if (examsubjectres) {
        return {
          errCode: 400,
          errMsg: '已绑定考试科目',
          errFix: '无修复建议'
        }
      }
      const marklogres = await db.collection('marklog').findOne({
        markerAccount: requestdata.account
      })
      if (marklogres) {
        return {
          errCode: 400,
          errMsg: '存在阅卷记录',
          errFix: '无修复建议'
        }
      }
      const scorereportconfigres = await db.collection('scorereportconfig').findOne({
        $or: [
          {
            jointVisibleAccount: requestdata.account
          },
          {
            schoolVisibleAccount: requestdata.account
          },
          {
            classVisibleAccount: requestdata.account
          }
        ]
      })
      if (scorereportconfigres) {
        return {
          errCode: 400,
          errMsg: '已绑定成绩报告',
          errFix: '无修复建议'
        }
      }
    }
    if (findres.type == 'student') {
      const classres = await db.collection('class').findOne({
        student: requestdata.account
      })
      if (classres) {
        return {
          errCode: 400,
          errMsg: '已绑定班级',
          errFix: '无修复建议'
        }
      }
      const answerres = await db.collection('answer').findOne({
        studentAccount: requestdata.account
      })
      if (answerres) {
        return {
          errCode: 400,
          errMsg: '存在作答记录',
          errFix: '无修复建议'
        }
      }
      const scorereportconfigres = await db.collection('scorereportconfig').findOne({
        student: requestdata.account
      })
      if (scorereportconfigres) {
        return {
          errCode: 400,
          errMsg: '存在成绩报告',
          errFix: '无修复建议'
        }
      }
    }
    await db.collection('account').deleteOne({
      account: requestdata.account,
      schoolId: account.schoolId,
      type: {
        $in: ['teacher', 'student']
      }
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}