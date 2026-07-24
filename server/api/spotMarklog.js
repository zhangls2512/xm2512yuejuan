'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { cropImage } = require('../util/image')
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
    if (examsubjectres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    let questionname
    if (account.type == 'admin' && account.schoolId == examgetres.schoolId) {
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
    if (!questionname || (questionname != 'all' && !questionname.includes(requestdata.questionName))) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const data = await db.collection('marklog').aggregate([
      {
        $match: {
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: requestdata.questionName,
          type: 'system',
          questionReason: '',
          updateMarkerAccount: ''
        }
      },
      {
        $sample: {
          size: 1
        }
      }
    ]).toArray()
    const marklogres = data[0]
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '阅卷记录不存在',
        errFix: '无修复建议'
      }
    }
    const result = {
      marklogId: marklogres.marklogId,
      answerImage: [],
      stepScore: marklogres.finalStepScore,
      totalScore: marklogres.finalTotalScore,
      history: []
    }
    const history = []
    if (marklogres.firstMarkerAccount) {
      history.push({
        type: '一评',
        markerAccount: marklogres.firstMarkerAccount,
        totalScore: sum(marklogres.firstMarkStepScore)
      })
    }
    if (marklogres.secondMarkerAccount) {
      history.push({
        type: '二评',
        markerAccount: marklogres.secondMarkerAccount,
        totalScore: sum(marklogres.secondMarkStepScore)
      })
    }
    if (marklogres.thirdMarkerAccount) {
      history.push({
        type: '三评',
        markerAccount: marklogres.thirdMarkerAccount,
        totalScore: sum(marklogres.thirdMarkStepScore)
      })
    }
    if (marklogres.arbitrateMarkerAccount) {
      history.push({
        type: '仲裁',
        markerAccount: marklogres.arbitrateMarkerAccount,
        totalScore: sum(marklogres.arbitrateMarkStepScore)
      })
    }
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(requestdata.questionName))
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject
    if (!examsubjectres.answerOnline) {
      const answer = await db.collection('answer').findOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: marklogres.studentAccount
      })
      if (answer) {
        const volume = examsubjectres.volume.find(item => item.name == answer.answer.volume)
        if (volume) {
          const pages = volume.page
          for (let i = 0; i < pages.length; i++) {
            const coord = pages[i].find(item => item.markGroupName == markgroup.name)
            if (coord && coord.coord) {
              for (let j = 0; j < coord.coord.length; j++) {
                const cropimagebase64 = await cropImage(read(rootdir + '/answer/' + marklogres.studentAccount + '/' + i), coord.coord[j], answer.answer.pageOriginCoord[i])
                result.answerImage.push(cropimagebase64)
              }
            }
          }
        }
      }
    }
    if (examsubjectres.answerOnline) {
      result.answerImage.push(read(rootdir + '/answer/' + marklogres.studentAccount + '/' + markgroup.name))
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}