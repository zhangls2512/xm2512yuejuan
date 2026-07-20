'use strict'
exports.main = async (event, configfilepath) => {
  const { read, write } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { getImageInfo } = require('../util/image')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (!Array.isArray(requestdata.stepScore) || !requestdata.stepScore.every(item => typeof (item) == 'number' && item >= 0)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的stepScore参数'
    }
  }
  if (!Array.isArray(requestdata.traceImage) || !requestdata.traceImage.every(item => typeof (item) == 'string' && (!item || /^data:image\/\w+;base64,/.test(item)))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的traceImage参数'
    }
  }
  if (typeof (requestdata.excellent) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的excellent参数'
    }
  }
  if (typeof (requestdata.typicalMistake) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的typicalMistake参数'
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
      }
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '问题卷不存在',
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
    const question = examsubjectres.subjectiveQuestion.find(item => item.name == marklogres.questionName)
    if (requestdata.stepScore.length != question.stepScore.length || !requestdata.stepScore.every((item, index) => question.stepScore[index].includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的stepScore参数'
      }
    }
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
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
    if (!examsubjectres.answerOnline) {
      let coordarr = []
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
              coordarr = coordarr.concat(coord.coord)
            }
          }
        }
      }
      if (requestdata.traceImage.length != coordarr.length) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的traceImage参数'
        }
      }
      for (let i = 0; i < coordarr.length; i++) {
        const coord = coordarr[i]
        const traceimage = requestdata.traceImage[i]
        if (!traceimage) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        const traceinfo = await getImageInfo(traceimage)
        if (!traceinfo || traceinfo.height != coord[3] - coord[1] || traceinfo.width != coord[2] - coord[0]) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
      }
    }
    if (examsubjectres.answerOnline) {
      if (requestdata.traceImage.length != 1) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的traceImage参数'
        }
      }
      const traceimage = requestdata.traceImage[0]
      const answerimage = read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + marklogres.examId + '/' + marklogres.subject + '/answer/' + marklogres.studentAccount + '/' + markgroup.name)
      if (!answerimage && traceimage) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的traceImage参数'
        }
      }
      if (answerimage) {
        const answerinfo = await getImageInfo(answerimage)
        if (!answerinfo && traceimage) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        if (answerinfo && !traceimage) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        const traceinfo = await getImageInfo(traceimage)
        if (!traceinfo || traceinfo.height != answerinfo.height || traceinfo.width != answerinfo.width) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
      }
    }
    const markres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      type: 'question'
    })
    function sum(arr) {
      return arr.reduce((sum, num) => sum + num, 0)
    }
    if (!markres) {
      await db.collection('marklog').insertOne({
        marklogId: marklogres.marklogId,
        examId: marklogres.examId,
        subject: marklogres.subject,
        studentAccount: marklogres.studentAccount,
        questionName: marklogres.questionName,
        markerAccount: account.account,
        excellent: requestdata.excellent,
        typicalMistake: requestdata.typicalMistake,
        type: 'question',
        stepScore: requestdata.stepScore,
        totalScore: sum(requestdata.stepScore)
      })
    }
    if (markres) {
      await db.collection('marklog').updateOne({
        marklogId: requestdata.id,
        type: 'question'
      }, {
        $set: {
          markerAccount: account.account,
          excellent: requestdata.excellent,
          typicalMistake: requestdata.typicalMistake,
          stepScore: requestdata.stepScore,
          totalScore: sum(requestdata.stepScore)
        }
      })
    }
    await db.collection('marklog').updateOne({
      marklogId: marklogres.marklogId,
      type: 'system',
      questionReason: {
        $exists: true,
        $ne: ''
      }
    }, {
      $set: {
        questionMarkerAccount: account.account,
        questionMarkStepScore: requestdata.stepScore,
        finalStepScore: requestdata.stepScore,
        finalTotalScore: sum(requestdata.stepScore)
      }
    })
    const dir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + marklogres.examId + '/' + marklogres.subject + '/marktraceimage/' + marklogres.studentAccount + '/' + marklogres.questionName + '-question-'
    for (let i = 0; i < requestdata.traceImage.length; i++) {
      const item = requestdata.traceImage[i]
      write(dir + i, item)
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}