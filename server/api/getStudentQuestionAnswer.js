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
    const scorereportres = await db.collection('scorereport').findOne({
      scorereportId: requestdata.id
    })
    if (!scorereportres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
        errFix: '无修复建议'
      }
    }
    if (!scorereportres.student.map(item => item.account).includes(studentAccount)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: scorereportres.scorereportconfigId,
      status: 'finished',
      subject: {
        $ne: '多学科'
      }
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
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
    if (account.type == 'student' && scorereportconfigres.studentVisible) {
      access = true
    }
    if (account.type == 'teacher') {
      if (scorereportres.type == 'class' && scorereportconfigres.classTeacherVisible) {
        access = true
      }
      if (scorereportres.type == 'joint' && scorereportconfigres.jointVisibleAccount.includes(account.account)) {
        access = true
      }
      if (scorereportres.type == 'school' && scorereportconfigres.schoolVisibleAccount.includes(account.account)) {
        access = true
      }
    }
    const classaccess = scorereportconfigres.classVisibleAccount.includes(account.account)
    if (scorereportres.type == 'class' && classaccess) {
      access = true
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (account.schoolId && scorereportres.type != 'joint') {
      if (scorereportres.type == 'school' && scorereportres.schoolId != account.schoolId) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (scorereportres.type == 'class') {
        const classres = await db.collection('class').findOne({
          classId: scorereportres.classId
        })
        if (!classres) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (classres.schoolId != account.schoolId) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (!classaccess) {
          const teachers = classres.subject.find(s => s.name == scorereportconfigres.subject)
          if (!teachers || !teachers.teacher.includes(account.account)) {
            return {
              errCode: 403,
              errMsg: '无权限',
              errFix: '无修复建议'
            }
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
    if (!examsubjectgetres.subjectiveQuestion.map(item => item.name).includes(requestdata.questionName)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的questionName参数'
      }
    }
    const marklogres = await db.collection('marklog').findOne({
      examId: scorereportconfigres.examId,
      subject: examsubjectgetres.name,
      studentAccount: studentAccount,
      questionName: requestdata.questionName,
      type: 'system'
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '作答不存在',
        errFix: '无修复建议'
      }
    }
    const markgroup = examsubjectgetres.markGroup.find(item => item.questionName.includes(requestdata.questionName))
    const result = {
      answerImage: [],
      stepScore: marklogres.finalStepScore,
      totalScore: marklogres.finalTotalScore
    }
    const rootdir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + scorereportconfigres.examId + '/' + examsubjectgetres.name + '/answer/' + studentAccount + '/'
    if (!examsubjectgetres.answerOnline) {
      const answer = await db.collection('answer').findOne({
        examId: scorereportconfigres.examId,
        subject: examsubjectgetres.name,
        studentAccount: studentAccount
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