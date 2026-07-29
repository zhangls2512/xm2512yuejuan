'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
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
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.name
    })
    if (!examsubjectgetres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (examsubjectgetres.markStatus != 'end') {
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
      const adminexist = examsubjectgetres.admin.find(item => item.account == account.account)
      if (!adminexist) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (adminexist && !adminexist.permission.includes('getAnswerCsv')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    function generatecsv(subject, marklog) {
      const rows = []
      const questionnamearr = subject.objectiveQuestion.map(item => item.name).concat(subject.subjectiveQuestion.map(item => item.name))
      rows.push(['学生账号'].concat(questionnamearr.map(item => '第' + item + '题')).join(','))
      const studentmap = {}
      marklog.forEach(item => {
        const student = item.studentAccount;
        if (!studentmap[student]) {
          studentmap[student] = {}
        }
        const question = subject.objectiveQuestion.find(q => q.name == item.questionName)
        if (question) {
          if (item.answer.length == 0) {
            studentmap[student][item.questionName] = '未选'
          }
          if (item.answer.length > 0) {
            studentmap[student][item.questionName] = item.answer.map(i => question.option[i]).join('')
          }
        }
        if (!question) {
          studentmap[student][item.questionName] = item.finalTotalScore
        }
      })
      Object.entries(studentmap).forEach(item => {
        const row = [item[0]]
        questionnamearr.forEach(i => {
          const answer = item[1][i]
          if (!answer) {
            row.push('-')
          }
          if (answer) {
            row.push(answer)
          }
        })
        rows.push(row.join(','))
      })
      return rows.join('\r\n')
    }
    const marklog = await db.collection('marklog').find({
      examId: requestdata.id,
      subject: requestdata.name,
      type: 'system'
    }).toArray()
    return {
      errCode: 0,
      errMsg: '成功',
      data: generatecsv(examsubjectgetres, marklog)
    }
  }
}