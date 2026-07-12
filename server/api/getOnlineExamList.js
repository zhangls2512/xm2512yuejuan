'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  const requestdata = JSON.parse(event.body)
  let skip = 0
  let limit = 10
  if (Number.isInteger(requestdata.skip) && requestdata.skip >= 0) {
    skip = requestdata.skip
  }
  if (Number.isInteger(requestdata.limit) && requestdata.limit > 0 && requestdata.limit <= 20) {
    limit = requestdata.limit
  }
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const classids = await db.collection('class').distinct('classId', {
      student: account.account
    })
    const data = await db.collection('examsubject').find({
      answerOnline: true,
      class: {
        $in: classids
      }
    }).sort({
      startTime: -1
    }).skip(skip).limit(limit).toArray()
    const result = []
    const exams = []
    const promises = [...new Set(data.map(item => item.examId))].map(async (item) => {
      const exam = await db.collection('exam').findOne({
        examId: item
      })
      if (!exam.schoolId || (exam.schoolId && account.schoolId)) {
        exams.push(exam)
      }
    })
    await Promise.all(promises)
    data.forEach(item => {
      const exist = exams.find(itema => itema.examId == item.examId)
      if (exist) {
        result.push({
          examId: exist.examId,
          examName: exist.name,
          examType: exist.type,
          subject: item.name,
          startTime: item.startTime,
          endTime: item.endTime
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