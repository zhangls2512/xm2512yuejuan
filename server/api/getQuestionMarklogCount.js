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
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
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
    if (examsubjectres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    let questionname
    if (account.type == 'admin' && account.schoolId == examgetres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('dealQuestion'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('dealQuestion'))) {
          if (!questionname) {
            questionname = []
          }
          questionname = questionname.concat(item.questionName)
        }
      }
    }
    if (!questionname) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    let count
    if (questionname == 'all') {
      count = await db.collection('marklog').countDocuments({
        examId: requestdata.id,
        subject: requestdata.subject,
        type: 'system',
        questionReason: {
          $exists: true,
          $ne: ''
        }
      })
    } else {
      count = await db.collection('marklog').countDocuments({
        examId: requestdata.id,
        subject: requestdata.subject,
        questionName: {
          $in: questionname
        },
        type: 'system',
        questionReason: {
          $exists: true,
          $ne: ''
        }
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}