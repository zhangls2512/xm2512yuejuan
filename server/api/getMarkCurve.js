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
  if (typeof (requestdata.questionName) != 'string' || !requestdata.questionName) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的questionName参数'
    }
  }
  if (typeof (requestdata.markerAccount) != 'string' || (requestdata.markerAccount && requestdata.markerAccount.length != 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的markerAccount参数'
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
    let questionname
    if (account.type == 'admin' && account.schoolId == examgetres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('getMarkCurve'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('getMarkCurve'))) {
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
    let data
    if (!requestdata.markerAccount) {
      data = await db.collection('marklog').aggregate([
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
          $group: {
            _id: '$finalTotalScore',
            count: {
              $sum: 1
            }
          }
        },
        {
          $project: {
            _id: 0,
            finalTotalScore: '$_id',
            count: 1
          }
        },
        {
          $sort: {
            finalTotalScore: 1
          }
        }
      ]).toArray()
    }
    if (requestdata.markerAccount) {
      data = await db.collection('marklog').aggregate([
        {
          $match: {
            examId: requestdata.id,
            subject: requestdata.subject,
            questionName: requestdata.questionName,
            type: 'system',
            questionReason: '',
            updateMarkerAccount: '',
            $or: [
              {
                firstMarkerAccount: requestdata.markerAccount
              },
              {
                secondMarkerAccount: requestdata.markerAccount
              },
              {
                thirdMarkerAccount: requestdata.markerAccount
              },
              {
                arbitrateMarkerAccount: requestdata.markerAccount
              }
            ]
          }
        },
        {
          $group: {
            _id: '$finalTotalScore',
            count: {
              $sum: 1
            }
          }
        },
        {
          $project: {
            _id: 0,
            finalTotalScore: '$_id',
            count: 1
          }
        },
        {
          $sort: {
            finalTotalScore: 1
          }
        }
      ]).toArray()
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: data
    }
  }
}