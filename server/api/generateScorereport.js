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
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: requestdata.id
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
        errFix: '无修复建议'
      }
    }
    if (scorereportconfigres.status == 'processing') {
      return {
        errCode: 400,
        errMsg: '成绩报告生成中',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: scorereportconfigres.examId
    })
    if (scorereportconfigres.subject == '多学科') {
      const admin = examres.admin.find(item => item.account == account.account)
      if (!admin && (account.type != 'admin' || account.schoolId != examres.schoolId)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (admin && !admin.permission.includes('manageScorereportconfig')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      require('../util/scorereport').generateMultipleSubjectScoreReport(examres, scorereportconfigres, configfilepath)
    }
    if (scorereportconfigres.subject != '多学科') {
      const examsubjectres = await db.collection('examsubject').findOne({
        examId: scorereportconfigres.examId,
        $or: [
          {
            name: scorereportconfigres.subject
          },
          {
            subSubject: scorereportconfigres.subject
          }
        ]
      })
      if (examsubjectres.markStatus != 'end') {
        return {
          errCode: 400,
          errMsg: '阅卷未结束',
          errFix: '无修复建议'
        }
      }
      if (!(account.type == 'admin' && account.schoolId == examres.schoolId)) {
        const adminexist = examsubjectres.admin.find(item => item.account == account.account)
        if (!adminexist) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (adminexist && !adminexist.permission.includes('manageScorereportconfig')) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
      }
      require('../util/scorereport').generateSingleSubjectScoreReport(examres, examsubjectres, scorereportconfigres, configfilepath)
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}