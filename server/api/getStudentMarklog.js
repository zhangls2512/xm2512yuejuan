'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const { sum } = require('../util/scorereport')
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
    if (examsubjectres.markStatus != 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷未结束',
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
      if (adminexist && !adminexist.permission.includes('updateScore')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const answer = await db.collection('answer').findOne({
      examId: requestdata.id,
      subject: requestdata.subject,
      studentAccount: requestdata.studentAccount
    })
    if (!answer) {
      return {
        errCode: 400,
        errMsg: '作答不存在',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').find({
      examId: requestdata.id,
      subject: requestdata.subject,
      studentAccount: requestdata.studentAccount,
      type: 'system'
    }).toArray()
    const result = {
      answerImage: [],
      marklog: []
    }
    const allmarkgroup = new Set()
    const allquestionnames = examsubjectres.objectiveQuestion.map(item => item.name).concat(examsubjectres.subjectiveQuestion.map(item => item.name))
    marklogres.sort((a, b) => allquestionnames.indexOf(a.questionName) - allquestionnames.indexOf(b.questionName)).forEach(m => {
      if (m.answer) {
        const question = examsubjectres.objectiveQuestion.find(q => q.name == m.questionName)
        result.marklog.push({
          questionName: m.questionName,
          answer: m.answer,
          option: question.option
        })
      } else {
        const question = examsubjectres.subjectiveQuestion.find(q => q.name == m.questionName)
        const history = []
        if (m.firstMarkerAccount) {
          history.push({
            type: '一评',
            markerAccount: m.firstMarkerAccount,
            totalScore: sum(m.firstMarkStepScore)
          })
        }
        if (m.secondMarkerAccount) {
          history.push({
            type: '二评',
            markerAccount: m.secondMarkerAccount,
            totalScore: sum(m.secondMarkStepScore)
          })
        }
        if (m.thirdMarkerAccount) {
          history.push({
            type: '三评',
            markerAccount: m.thirdMarkerAccount,
            totalScore: sum(m.thirdMarkStepScore)
          })
        }
        if (m.arbitrateMarkerAccount) {
          history.push({
            type: '仲裁',
            markerAccount: m.arbitrateMarkerAccount,
            totalScore: sum(m.arbitrateMarkStepScore)
          })
        }
        if (m.questionMarkerAccount) {
          history.push({
            type: '问题卷',
            markerAccount: m.questionMarkerAccount,
            totalScore: sum(m.questionMarkStepScore)
          })
        }
        if (m.updateMarkerAccount) {
          history.push({
            type: '修改/补录',
            markerAccount: m.updateMarkerAccount,
            totalScore: sum(m.updateMarkStepScore)
          })
        }
        result.marklog.push({
          questionName: m.questionName,
          stepScore: m.finalStepScore.length > 0 ? m.finalStepScore : question.stepScore.map(q => q[q.length - 1]),
          stepScoreRule: question.stepScore,
          history: history
        })
        if (examsubjectres.answerOnline) {
          const markgroup = examsubjectres.markGroup.find(g => g.questionName.includes(m.questionName))
          allmarkgroup.add(markgroup.name)
        }
      }
    })
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + requestdata.studentAccount + '/'
    if (!examsubjectres.answerOnline) {
      const volume = examsubjectres.volume.find(v => v.name == answer.answer.volume)
      volume.page.forEach((item, index) => {
        result.answerImage.push(read(rootdir + index))
      })
    }
    if (examsubjectres.answerOnline) {
      [...allmarkgroup].forEach(item => {
        result.answerImage.push(read(rootdir + item))
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}