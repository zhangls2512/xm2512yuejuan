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
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (!['normal', 'arbitrate'].includes(requestdata.type)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
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
    if (examsubjectres.markStatus == 'paused') {
      return {
        errCode: 400,
        errMsg: '阅卷未开始',
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
    const markgroup = examsubjectres.markGroup.find(item => item.name == requestdata.name)
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '阅卷组不存在',
        errFix: '无修复建议'
      }
    }
    const member = markgroup.member.find(item => item.account == account.account)
    if (requestdata.type == 'normal' && !member) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (requestdata.type == 'arbitrate' && !markgroup.arbitrator.includes(account.account)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (requestdata.type == 'normal') {
      return {
        errCode: 0,
        errMsg: '成功',
        quota: member.quota * markgroup.questionName.length
      }
    }
    if (requestdata.type == 'arbitrate') {
      let count = 0
      if (markgroup.time == 2) {
        count = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          type: 'system',
          firstMarkerAccount: {
            $nin: ['', account.account]
          },
          secondMarkerAccount: {
            $nin: ['', account.account]
          },
          thirdMarkerAccount: {
            $ne: account.account
          },
          questionReason: '',
          $or: markgroup.questionName.map(item => {
            return {
              questionName: item,
              minScoreDiff: {
                $gt: examsubjectres.subjectiveQuestion.find(q => q.name == item).arbitrateScoreDiff
              }
            }
          })
        })
      }
      if (markgroup.time == 3) {
        count = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          type: 'system',
          firstMarkerAccount: {
            $nin: ['', account.account]
          },
          secondMarkerAccount: {
            $nin: ['', account.account]
          },
          thirdMarkerAccount: {
            $nin: ['', account.account]
          },
          questionReason: '',
          $or: markgroup.questionName.map(item => {
            return {
              questionName: item,
              minScoreDiff: {
                $gt: examsubjectres.subjectiveQuestion.find(q => q.name == item).arbitrateScoreDiff
              }
            }
          })
        })
      }
      return {
        errCode: 0,
        errMsg: '成功',
        quota: count
      }
    }
  }
}