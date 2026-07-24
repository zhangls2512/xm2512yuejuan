'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { cropImage } = require('../util/image')
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
    if (account.type != 'teacher') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      markerAccount: account.account,
      type: {
        $in: ['first', 'second', 'third', 'arbitrate']
      }
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '阅卷记录不存在',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: marklogres.examId,
      name: marklogres.subject
    })
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
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
    const member = markgroup.member.find(item => item.account == account.account)
    if (marklogres.type != 'arbitrate' && !member) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (marklogres.type == 'arbitrate' && !markgroup.arbitrator.includes(account.account)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const result = {
      answerImage: [],
      traceImage: [],
      marklogList: []
    }
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + marklogres.examId + '/' + marklogres.subject
    if (!examsubjectres.answerOnline) {
      const answer = await db.collection('answer').findOne({
        examId: marklogres.examId,
        subject: marklogres.subject,
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
    for (let i = 0; i < result.answerImage.length; i++) {
      const answerimage = result.answerImage[i]
      if (!answerimage) {
        result.traceImage.push('')
      }
      if (answerimage) {
        result.traceImage.push(read(rootdir + '/marktraceimage/' + marklogres.studentAccount + '/' + marklogres.questionName + '-' + marklogres.type + '-' + i))
      }
    }
    if (marklogres.type == 'first' || marklogres.type == 'second') {
      const data = await db.collection('marklog').find({
        examId: marklogres.examId,
        subject: marklogres.subject,
        markerAccount: account.account,
        studentAccount: marklogres.studentAccount,
        questionName: {
          $in: markgroup.questionName
        },
        type: {
          $in: ['first', 'second']
        }
      }).toArray()
      result.marklogList = data.map(item => {
        return {
          id: item.marklogId,
          questionName: item.questionName,
          stepScore: examsubjectres.subjectiveQuestion.find(i => i.name == item.questionName).stepScore,
          markStepScore: item.stepScore,
          excellent: item.excellent,
          typicalMistake: item.typicalMistake,
          doubtful: item.doubtful
        }
      }).sort((a, b) => a.questionName.localeCompare(b.questionName))
    }
    if (marklogres.type == 'third' || marklogres.type == 'arbitrate') {
      result.marklogList.push({
        id: marklogres.marklogId,
        questionName: marklogres.questionName,
        stepScore: examsubjectres.subjectiveQuestion.find(item => item.name == marklogres.questionName).stepScore,
        markStepScore: marklogres.stepScore,
        excellent: marklogres.excellent,
        typicalMistake: marklogres.typicalMistake,
        doubtful: marklogres.doubtful
      })
    }
    if (marklogres.type == 'arbitrate') {
      const marklog = await db.collection('marklog').findOne({
        marklogId: requestdata.id,
        type: 'system'
      })
      result.scoreHistory = {
        first: marklog.firstMarkStepScore,
        second: marklog.secondMarkStepScore,
        third: marklog.thirdMarkStepScore
      }
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}