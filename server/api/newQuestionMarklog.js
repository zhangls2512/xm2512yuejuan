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
    if (account.type == 'student') {
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
    if (examsubjectres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: marklogres.examId
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    let questionname
    if (account.type == 'admin' && account.schoolId == examres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('spotMarklog'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('spotMarklog'))) {
          if (!questionname) {
            questionname = []
          }
          questionname = questionname.concat(item.questionName)
        }
      }
    }
    if (examsubjectres.markStatus == 'paused' && !questionname) {
      return {
        errCode: 400,
        errMsg: '阅卷未开始',
        errFix: '无修复建议'
      }
    }
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
    const ismember = markgroup.member.find(item => item.account == account.account)
    const isarbitrator = markgroup.arbitrator && markgroup.arbitrator.includes(account.account)
    let access = false
    if (ismember && !marklogres.arbitrateMarkerAccount) {
      if (marklogres.firstMarkerAccount == account.account || marklogres.secondMarkerAccount == account.account || marklogres.thirdMarkerAccount == account.account) {
        access = true
      } else {
        if (markgroup.time == 1 && !marklogres.firstMarkerAccount) {
          access = true
        }
        if (markgroup.time == 2 && !marklogres.secondMarkerAccount) {
          access = true
        }
        if (markgroup.time == 3 && marklogres.minScoreDiff > examsubjectres.subjectiveQuestion.find(q => q.name == marklogres.questionName).arbitrateScoreDiff) {
          access = true
        }
      }
    }
    if (isarbitrator) {
      if (marklogres.arbitrateMarkerAccount == account.account) {
        access = true
      }
      if (!marklogres.arbitrateMarkerAccount && marklogres.minScoreDiff > examsubjectres.subjectiveQuestion.find(q => q.name == marklogres.questionName).arbitrateScoreDiff) {
        if (markgroup.time == 2 || (markgroup.time == 3 && marklogres.thirdMarkerAccount)) {
          access = true
        }
      }
    }
    if (questionname == 'all' || questionname.includes(marklogres.questionName)) {
      if (marklogres.firstMarkerAccount || marklogres.secondMarkerAccount || marklogres.thirdMarkerAccount || marklogres.arbitrateMarkerAccount) {
        access = true
      }
    }
    if (!access) {
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
        questionReason: requestdata.reason,
        questionNewAccount: account.account
      }
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}