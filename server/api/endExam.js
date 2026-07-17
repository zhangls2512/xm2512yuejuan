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
    const admin = examgetres.admin.find(item => item.account == account.account)
    if (!admin && (account.type != 'admin' || account.schoolId != examgetres.schoolId)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (admin && !admin.permission.includes('endExam')) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (examgetres.end) {
      return {
        errCode: 400,
        errMsg: '考试已结束',
        errFix: '无修复建议'
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      markStatus: {
        $ne: 'end'
      }
    })
    if (examsubjectgetres) {
      return {
        errCode: 400,
        errMsg: '存在未结束阅卷的科目',
        errFix: '无修复建议'
      }
    }
    await db.collection('exam').updateOne({
      examId: requestdata.id
    }, {
      $set: {
        end: true
      }
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}