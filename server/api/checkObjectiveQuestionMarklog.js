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
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
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
      if (adminexist && !adminexist.permission.includes('checkObjectiveQuestionMarklog')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    const noemptyquestionnames = []
    const singlequestionnames = []
    examsubjectres.objectiveQuestion.forEach(item => {
      if (item.correctOptionIndex.length > 0) {
        noemptyquestionnames.push(item.name)
      }
      if (item.correctOptionIndex.length == 1) {
        singlequestionnames.push(item.name)
      }
    })
    const result = {
      empty: [],
      multiple: []
    }
    const marklogres = await db.collection('marklog').find({
      examId: requestdata.id,
      subject: requestdata.subject,
      questionName: {
        $in: noemptyquestionnames.concat(singlequestionnames)
      },
      type: 'system',
      $or: [
        {
          questionName: {
            $in: noemptyquestionnames
          },
          $expr: {
            $eq: [
              {
                $size: {
                  $ifNull: ['$answer', []]
                }
              },
              0
            ]
          }
        },
        {
          questionName: {
            $in: singlequestionnames
          },
          $expr: {
            $gt: [
              {
                $size: {
                  $ifNull: ['$answer', []]
                }
              },
              1
            ]
          }
        }
      ]
    }, {
      projection: {
        _id: false,
        questionName: true,
        studentAccount: true,
        answer: true
      }
    }).toArray()
    marklogres.forEach(item => {
      if (item.answer.length == 0) {
        result.empty.push({
          questionName: item.questionName,
          studentAccount: item.studentAccount
        })
      }
      if (item.answer.length > 1) {
        result.multiple.push({
          questionName: item.questionName,
          studentAccount: item.studentAccount,
          answer: item.answer
        })
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}