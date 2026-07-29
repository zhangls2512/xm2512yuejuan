'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.end) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的end参数'
    }
  }
  let markstatus = 'end'
  if (!requestdata.end) {
    markstatus = {
      $ne: 'end'
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
    const data = await db.collection('examsubject').find({
      adminAccount: account.account,
      markStatus: markstatus
    }).sort({
      createTime: -1
    }).skip(skip).limit(limit).toArray()
    const exams = await db.collection('exam').find({
      examId: {
        $in: [...new Set(data.map(item => item.examId))]
      }
    }).toArray()
    const result = []
    data.forEach(item => {
      const exam = exams.find(i => i.examId == item.examId && (!i.schoolId || i.schoolId == account.schoolId))
      if (exam) {
        ['_id', 'examId', 'adminAccount', 'subSubject', 'createTime'].forEach(key => {
          delete item[key]
        })
        const resultitem = {
          examId: exam.examId,
          examName: exam.name,
          examType: exam.type,
          examTime: exam.time,
          subject: item,
          markStatus: item.markStatus,
          admin: false,
          normalMarkGroupName: [],
          arbitrateMarkGroupName: [],
          adminMarkGroupName: []
        }
        if (item.admin.map(i => i.account).includes(account.account)) {
          resultitem.admin = true
        }
        item.markGroup.forEach(m => {
          if (m.member.map(i => i.account).includes(account.account)) {
            resultitem.normalMarkGroupName.push(m.name)
          }
          if (m.arbitrator.includes(account.account)) {
            resultitem.arbitrateMarkGroupName.push(m.name)
          }
          if (m.admin.map(i => i.account).includes(account.account)) {
            resultitem.adminMarkGroupName.push(m.name)
          }
        })
        result.push(resultitem)
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}