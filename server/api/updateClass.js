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
  if (!Array.isArray(requestdata.student) || !requestdata.student.every(item => typeof (item) == 'string' && item.length == 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的student参数'
    }
  }
  if (!Array.isArray(requestdata.subject) || !requestdata.subject.every(item => typeof (item.name) == 'string' && item.name)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  if (!requestdata.subject.every(item => Array.isArray(item.teacher) && item.teacher.every(itema => typeof (itema) == 'string' && itema.length == 36))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  const subject = []
  let allteacher = []
  requestdata.subject.forEach(item => {
    if (!subject.find(itema => itema.name == item.name)) {
      const teacher = [...new Set(item.teacher)]
      subject.push({
        name: item.name,
        teacher: teacher
      })
      allteacher = allteacher.concat(teacher)
    }
  })
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'admin' || !account.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const student = [...new Set(requestdata.student)]
    const teacher = [...new Set(allteacher)]
    const accountres = await db.collection('account').find({
      schoolId: account.schoolId
    }, {
      projection: {
        _id: false,
        account: true,
        type: true
      }
    }).toArray()
    const validstudents = accountres.filter(item => item.type == 'student').map(item => item.account)
    if (student.some(item => !validstudents.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的student参数'
      }
    }
    const validteachers = accountres.filter(item => item.type == 'teacher').map(item => item.account)
    if (teacher.some(item => !validteachers.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subject参数'
      }
    }
    const updateres = await db.collection('class').updateOne({
      classId: requestdata.id,
      schoolId: account.schoolId
    }, {
      $set: {
        name: requestdata.name,
        student: student,
        subject: subject,
        teacherAccount: teacher
      }
    })
    if (updateres.matchedCount != 0) {
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (updateres.matchedCount == 0) {
      return {
        errCode: 400,
        errMsg: '班级不存在',
        errFix: '无修复建议'
      }
    }
  }
}