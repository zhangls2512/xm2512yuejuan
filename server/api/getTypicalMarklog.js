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
  if (typeof (requestdata.questionName) != 'string' || !requestdata.questionName) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的questionName参数'
    }
  }
  if (!['excellent', 'typicalMistake'].includes(requestdata.type)) {
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
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: requestdata.id,
      status: 'finished',
      subject: {
        $ne: '多学科'
      }
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告配置不存在',
        errFix: '无修复建议'
      }
    }
    if (!scorereportconfigres.config.scoringQuestionNames.includes(requestdata.questionName)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的questionName参数'
      }
    }
    let access = false
    if (scorereportconfigres.classTeacherVisible) {
      access = true
    }
    if (scorereportconfigres.jointVisibleAccount.includes(account.account)) {
      access = true
    }
    if (scorereportconfigres.schoolVisibleAccount.includes(account.account)) {
      access = true
    }
    if (scorereportconfigres.classVisibleAccount.includes(account.account)) {
      access = true
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: scorereportconfigres.examId,
      $or: [
        {
          name: scorereportconfigres.subject
        },
        {
          subSubject: scorereportconfigres.subject
        }
      ]
    })
    if (!examsubjectgetres.subjectiveQuestion.map(item => item.name).includes(requestdata.questionName)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的questionName参数'
      }
    }
    if (examsubjectgetres.markStatus != 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷未结束',
        errFix: '无修复建议'
      }
    }
    let data = []
    if (requestdata.type == 'excellent') {
      data = await db.collection('marklog').aggregate([
        {
          $match: {
            examId: scorereportconfigres.examId,
            subject: examsubjectgetres.name,
            questionName: requestdata.questionName,
            excellent: true
          }
        },
        {
          $sample: {
            size: 1
          }
        }
      ]).toArray()
    }
    if (requestdata.type == 'typicalMistake') {
      data = await db.collection('marklog').aggregate([
        {
          $match: {
            examId: scorereportconfigres.examId,
            subject: examsubjectgetres.name,
            questionName: requestdata.questionName,
            typicalMistake: true
          }
        },
        {
          $sample: {
            size: 1
          }
        }
      ]).toArray()
    }
    const marklogres = data[0]
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '典型卷不存在',
        errFix: '无修复建议'
      }
    }
    const markgroup = examsubjectgetres.markGroup.find(item => item.questionName.includes(requestdata.questionName))
    const result = {
      answerImage: [],
      stepScore: marklogres.stepScore,
      totalScore: marklogres.totalScore
    }
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + scorereportconfigres.examId + '/' + examsubjectgetres.name + '/answer/' + marklogres.studentAccount + '/'
    if (!examsubjectgetres.answerOnline) {
      const answer = await db.collection('answer').findOne({
        examId: scorereportconfigres.examId,
        subject: examsubjectgetres.name,
        studentAccount: marklogres.studentAccount
      })
      if (answer) {
        const volume = examsubjectgetres.volume.find(item => item.name == answer.answer.volume)
        if (volume) {
          const pages = volume.page
          for (let i = 0; i < pages.length; i++) {
            const coord = pages[i].find(item => item.markGroupName == markgroup.name)
            if (coord && coord.coord) {
              for (let j = 0; j < coord.coord.length; j++) {
                const cropimagebase64 = await cropImage(read(rootdir + i), coord.coord[j], answer.answer.pageOriginCoord[i])
                result.answerImage.push(cropimagebase64)
              }
            }
          }
        }
      }
    }
    if (examsubjectgetres.answerOnline) {
      result.answerImage.push(read(rootdir + markgroup.name))
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}