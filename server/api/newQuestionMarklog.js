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
  if (typeof (requestdata.reason) != 'string' || !requestdata.reason) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的reason参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'teacher') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      type: 'system'
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '阅卷记录不存在',
        errFix: '无修复建议'
      }
    }
    if (marklogres.questionReason) {
      return {
        errCode: 400,
        errMsg: '已是问题卷',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: marklogres.examId,
      name: marklogres.subject
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
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '阅卷组不存在',
        errFix: '无修复建议'
      }
    }
    const member = markgroup.member.find(item => item.account == account.account)
    const isarbitrator = markgroup.arbitrator && markgroup.arbitrator.includes(account.account)
    if (!member && !isarbitrator) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: marklogres.examId
    })
    if (!examgetres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (examgetres.schoolId && examgetres.schoolId != account.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    await db.collection('marklog').updateOne({
      marklogId: requestdata.id,
      type: 'system'
    }, {
      $set: {
        questionReason: requestdata.reason
      }
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}