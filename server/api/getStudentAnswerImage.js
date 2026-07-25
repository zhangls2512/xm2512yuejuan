'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { getOnlineTrace, getScanTrace } = require('../util/trace')
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
    if (account.type == 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const studentAccount = account.type == 'teacher' ? requestdata.studentAccount : account.account
    if (typeof (studentAccount) != 'string' || studentAccount.length != 36) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的studentAccount参数'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: requestdata.id,
      status: 'finished',
      subject: {
        $ne: '多学科'
      },
      student: studentAccount
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告配置不存在',
        errFix: '无修复建议'
      }
    }
    let access = false
    if (account.type == 'student' && scorereportconfigres.studentVisible) {
      access = true
    }
    if (account.type == 'teacher') {
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
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (account.schoolId && scorereportconfigres.type != 'joint') {
      if (scorereportconfigres.type == 'school' && scorereportconfigres.schoolId != account.schoolId) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (scorereportconfigres.type == 'class') {
        const classres = await db.collection('class').findOne({
          classId: scorereportconfigres.classId
        })
        if (classres.schoolId != account.schoolId) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
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
    const marklogres = await db.collection('marklog').find({
      examId: scorereportconfigres.examId,
      subject: examsubjectgetres.name,
      studentAccount: studentAccount,
      questionName: {
        $in: scorereportconfigres.config.scoringQuestionNames
      },
      type: 'system'
    }).toArray()
    const result = {
      answerOnline: examsubjectgetres.answerOnline,
      image: []
    }
    function getFirstNonEmptyPrefix(obj) {
      const priority = ['update', 'question', 'arbitrate', 'third', 'second', 'first']
      for (let i = 0; i < priority.length; i++) {
        if (obj[priority[i] + 'MarkerAccount']) {
          return priority[i]
        }
      }
      return ''
    }
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + scorereportconfigres.examId + '/' + examsubjectgetres.name
    if (!result.answerOnline) {
      const answer = await db.collection('answer').findOne({
        examId: scorereportconfigres.examId,
        subject: examsubjectgetres.name,
        studentAccount: studentAccount
      })
      const volume = examsubjectgetres.volume.find(item => item.name == answer.answer.volume)
      function getCoordCount(questionname) {
        const markgroup = examsubjectgetres.markGroup.find(m => m.questionName.includes(questionname))
        const pages = volume.page
        let count = 0
        for (let i = 0; i < pages.length; i++) {
          const coord = pages[i].find(item => item.markGroupName == markgroup.name)
          if (coord) {
            count += coord.coord.length
          }
        }
        return count
      }
      const marklogarr = []
      marklogres.forEach(item => {
        if (item.answer) {
          marklogarr.push({
            questionName: item.questionName,
            answer: item.answer
          })
        } else {
          const coordcount = getCoordCount(item.questionName)
          const marktype = getFirstNonEmptyPrefix(item)
          if (!marktype) {
            marklogarr.push({
              questionName: item.questionName,
              finalStepScore: item.finalStepScore,
              finalTotalScore: item.finalTotalScore,
              traceImage: Array.from({
                length: coordcount
              }, () => {
                return ''
              })
            })
          }
          if (marktype) {
            const traceimage = []
            for (let i = 0; i < coordcount; i++) {
              traceimage.push(read(rootdir + '/marktraceimage/' + studentAccount + '/' + item.questionName + '-' + marktype + '-' + i))
            }
            marklogarr.push({
              questionName: item.questionName,
              finalStepScore: item.finalStepScore,
              finalTotalScore: item.finalTotalScore,
              traceImage: traceimage
            })
          }
        }
      })
      const trace = getScanTrace(examsubjectgetres, marklogarr.sort((a, b) => a.questionName.localeCompare(b.questionName)), answer.answer.pageOriginCoord, answer.answer.volume)
      volume.page.forEach((item, index) => {
        result.image.push({
          answerImage: read(rootdir + '/answer/' + studentAccount + '/' + index),
          trace: trace[index]
        })
      })
    }
    if (result.answerOnline) {
      const marklogarr = []
      marklogres.filter(m => examsubjectgetres.subjectiveQuestion.map(q => q.name).includes(m.questionName)).forEach(item => {
        const marktype = getFirstNonEmptyPrefix(item)
        if (!marktype) {
          marklogarr.push({
            questionName: item.questionName,
            finalStepScore: item.finalStepScore,
            finalTotalScore: item.finalTotalScore,
            traceImage: ['']
          })
        }
        if (marktype) {
          const traceimage = read(rootdir + '/marktraceimage/' + studentAccount + '/' + item.questionName + '-' + marktype + '-0')
          marklogarr.push({
            questionName: item.questionName,
            finalStepScore: item.finalStepScore,
            finalTotalScore: item.finalTotalScore,
            traceImage: [traceimage]
          })
        }
      })
      const trace = getOnlineTrace(examsubjectgetres, marklogarr.sort((a, b) => a.questionName.localeCompare(b.questionName)))
      marklogarr.forEach((item, index) => {
        const markgroup = examsubjectgetres.markGroup.find(m => m.questionName.includes(item.questionName))
        result.image.push({
          questionName: item.questionName,
          answerImage: read(rootdir + '/answer/' + studentAccount + '/' + markgroup.name),
          trace: trace[index]
        })
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}