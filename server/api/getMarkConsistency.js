'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { average, fixtwo, sum } = require('../util/scorereport')
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
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
      const adminexist = examsubjectres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('getMarkConsistency')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const markconsistencyres = await db.collection('marklog').find({
      examId: requestdata.id,
      subject: requestdata.subject,
      type: 'consistencycheck'
    }).toArray()
    const markermap = {}
    const questiontotalscoremap = {}
    markconsistencyres.forEach(m => {
      if (!markermap[m.markerAccount]) {
        markermap[m.markerAccount] = {
          markerAccount: m.markerAccount,
          questions: []
        }
      }
      const averagescorediff = average(m.scoreDiff)
      if (!questiontotalscoremap[m.questionName]) {
        questiontotalscoremap[m.questionName] = sum(examsubjectres.subjectiveQuestion.find(q => q.name == m.questionName).stepScore.map(s => s[0]))
      }
      markermap[m.markerAccount].questions.push({
        name: m.questionName,
        averageScoreDiff: averagescorediff,
        diffPercent: fixtwo(averagescorediff / questiontotalscoremap[m.questionName]) * 100
      })
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: Object.values(markermap)
    }
  }
}