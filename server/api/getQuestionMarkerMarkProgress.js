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
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(requestdata.questionName))
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '题号不存在',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    let access = false
    if (account.type == 'admin' && account.schoolId == examres.schoolId) {
      access = true
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('getMarkProgress'))) {
      access = true
    }
    if (markgroup.admin.find(item => item.account == account.account && item.permission.includes('getMarkProgress'))) {
      access = true
    }
    if (!access) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const result = await db.collection('marklog').aggregate([
      {
        $match: {
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: requestdata.questionName,
          type: {
            $in: ['first', 'second', 'third', 'arbitrate']
          }
        }
      },
      {
        $group: {
          _id: '$markerAccount',
          count: {
            $sum: 1
          }
        }
      },
      {
        $project: {
          _id: 0,
          account: '$_id',
          count: 1
        }
      }
    ]).toArray()
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}