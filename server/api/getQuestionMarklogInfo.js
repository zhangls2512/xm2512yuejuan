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
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      type: 'system',
      questionReason: {
        $exists: true,
        $ne: ''
      },
      updateMarkerAccount: ''
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '问题卷不存在',
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
    const examgetres = await db.collection('exam').findOne({
      examId: marklogres.examId
    })
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
    if (!questionname || (questionname != 'all' && !questionname.includes(marklogres.questionName))) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const result = {
      answerImage: [],
      traceImage: [],
      marklogList: [],
      questionReason: marklogres.questionReason,
      studentAccount: marklogres.studentAccount
    }
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
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
    const markres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      type: 'question'
    })
    if (markres) {
      for (let i = 0; i < result.answerImage.length; i++) {
        const answerimage = result.answerImage[i]
        if (!answerimage) {
          result.traceImage.push('')
        }
        if (answerimage) {
          result.traceImage.push(read(rootdir + '/marktraceimage/' + marklogres.studentAccount + '/' + marklogres.questionName + '-question-' + i))
        }
      }
    }
    result.marklogList.push({
      id: marklogres.marklogId,
      questionName: marklogres.questionName,
      stepScore: examsubjectres.subjectiveQuestion.find(item => item.name == marklogres.questionName).stepScore,
      markStepScore: markres ? markres.stepScore : examsubjectres.subjectiveQuestion.find(item => item.name == marklogres.questionName).stepScore.map(i => i[i.length - 1]),
      excellent: markres ? markres.excellent : false,
      typicalMistake: markres ? markres.typicalMistake : false
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}