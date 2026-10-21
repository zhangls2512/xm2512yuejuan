'use strict'
exports.main = async (event, configfilepath) => {
  const { rmstartswith } = require('../../util/file')
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
  if (typeof (requestdata.questionName) != 'string' || !requestdata.questionName) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的questionName参数'
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
    if (examsubjectres.markStatus == 'processing') {
      return {
        errCode: 400,
        errMsg: '阅卷进行中',
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
    let questionname
    if (account.type == 'admin' && account.schoolId == examgetres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('clearMarklog'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('clearMarklog'))) {
          if (!questionname) {
            questionname = []
          }
          questionname = questionname.concat(item.questionName)
        }
      }
    }
    if (!questionname || (questionname != 'all' && !questionname.includes(requestdata.questionName))) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      examId: requestdata.id,
      subject: {
        $in: [examsubjectres.name].concat(examsubjectres.subSubject)
      }
    }, {
      projection: {
        _id: false
      }
    })
    if (scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '已生成成绩报告',
        errFix: '无修复建议'
      }
    }
    await db.collection('marklog').updateOne({
      examId: requestdata.id,
      subject: requestdata.subject,
      questionName: requestdata.questionName,
      type: 'system',
      updateMarkerAccount: ''
    }, {
      $set: {
        firstMarkerAccount: '',
        secondMarkerAccount: '',
        thirdMarkerAccount: '',
        arbitrateMarkerAccount: '',
        questionMarkerAccount: '',
        firstMarkStepScore: [],
        secondMarkStepScore: [],
        thirdMarkStepScore: [],
        arbitrateMarkStepScore: [],
        questionMarkStepScore: [],
        questionReason: '',
        questionNewAccount: '',
        minScoreDiff: 0,
        finalStepScore: [],
        finalTotalScore: 0
      }
    })
    await db.collection('marklog').deleteMany({
      examId: requestdata.id,
      subject: requestdata.subject,
      questionName: requestdata.questionName,
      type: {
        $in: ['first', 'second', 'third', 'arbitrate', 'question', 'consistencycheck']
      }
    })
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/marktrace/'
    const startswith = ['first', 'second', 'third', 'arbitrate', 'question'].map(item => requestdata.questionName + '-' + item)
    rmstartswith(rootdir, startswith)
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}