'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
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
    let count = 0
    if (account.type == 'student') {
      count = await db.collection('scorereportconfig').countDocuments({
        studentVisible: true,
        status: 'finished',
        student: account.account
      })
    }
    if (account.type == 'teacher') {
      if (!['joint', 'school', 'class'].includes(requestdata.type)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的type参数'
        }
      }
      if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的subject参数'
        }
      }
      if (requestdata.type == 'joint') {
        count = await db.collection('scorereportconfig').countDocuments({
          subject: requestdata.subject,
          status: 'finished',
          jointVisibleAccount: account.account
        })
      }
      if (requestdata.type == 'school') {
        const schoolId = account.schoolId ? account.schoolId : requestdata.id
        if (!schoolId) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的id参数'
          }
        }
        const idres = await db.collection('scorereportconfig').find({
          subject: requestdata.subject,
          status: 'finished',
          schoolVisibleAccount: account.account
        }).toArray()
        count = await db.collection('scorereport').countDocuments({
          scorereportconfigId: {
            $in: idres.map(item => item.scorereportconfigId)
          },
          type: 'school',
          schoolId: schoolId
        })
      }
      if (requestdata.type == 'class') {
        if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的id参数'
          }
        }
        const classres = await db.collection('class').findOne({
          classId: requestdata.id
        })
        if (account.schoolId && classres.schoolId != account.schoolId) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        let classteacher = false
        if (classres) {
          const subject = classres.subject.find(item => item.name == requestdata.subject)
          if (subject && subject.teacher.includes(account.account)) {
            classteacher = true
          }
        }
        let idres
        if (!classteacher) {
          idres = await db.collection('scorereportconfig').find({
            subject: requestdata.subject,
            status: 'finished',
            classVisibleAccount: account.account
          }).toArray()
        }
        if (classteacher) {
          idres = await db.collection('scorereportconfig').find({
            subject: requestdata.subject,
            status: 'finished',
            $or: [
              {
                classVisibleAccount: account.account
              },
              {
                classTeacherVisible: true
              }
            ]
          }).toArray()
        }
        count = await db.collection('scorereport').countDocuments({
          scorereportconfigId: {
            $in: idres.map(item => item.scorereportconfigId)
          },
          type: 'class',
          classId: requestdata.id
        })
      }
    }
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}