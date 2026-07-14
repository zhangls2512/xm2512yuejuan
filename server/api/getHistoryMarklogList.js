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
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (!['normal', 'arbitrate'].includes(requestdata.type)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
    }
  }
  let skip = 0
  let limit = 10
  if (Number.isInteger(requestdata.skip) && requestdata.skip >= 0) {
    skip = requestdata.skip
  }
  if (Number.isInteger(requestdata.limit) && requestdata.limit > 0 && requestdata.limit <= 20) {
    limit = requestdata.limit
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
    const markgroup = examsubjectres.markGroup.find(item => item.name == requestdata.name)
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '阅卷组不存在',
        errFix: '无修复建议'
      }
    }
    const member = markgroup.member.find(item => item.account == account.account)
    if (requestdata.type == 'normal' && !member) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (requestdata.type == 'arbitrate' && !markgroup.arbitrator.includes(account.account)) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examgetres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (examgetres.schoolId && examgetres.schoolId != account.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (requestdata.type == 'normal') {
      const data = await db.collection('marklog').find({
        examId: requestdata.id,
        subject: requestdata.subject,
        questionName: {
          $in: markgroup.questionName
        },
        markerAccount: account.account,
        type: {
          $in: ['first', 'second', 'third']
        }
      }).sort({
        createTime: -1
      }).skip(skip).limit(limit).toArray()
      return {
        errCode: 0,
        errMsg: '成功',
        data: data.map(item => {
          return {
            id: item.marklogId,
            questionName: item.questionName,
            totalScore: item.totalScore,
            doubtful: item.doubtful
          }
        })
      }
    }
    if (requestdata.type == 'arbitrate') {
      const data = await db.collection('marklog').find({
        examId: requestdata.id,
        subject: requestdata.subject,
        questionName: {
          $in: markgroup.questionName
        },
        markerAccount: account.account,
        type: 'arbitrate'
      }).sort({
        createTime: -1
      }).skip(skip).limit(limit).toArray()
      return {
        errCode: 0,
        errMsg: '成功',
        data: data.map(item => {
          return {
            id: item.marklogId,
            questionName: item.questionName,
            totalScore: item.totalScore,
            doubtful: item.doubtful
          }
        })
      }
    }
  }
}