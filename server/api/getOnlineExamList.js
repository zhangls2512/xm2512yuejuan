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
      endTime: {
        $gte: Date.now()
      },
      class: {
        $in: classids
      }
    }).sort({
      startTime: -1
    }).skip(skip).limit(limit).toArray()
    const exams = await db.collection('exam').find({
      examId: {
        $in: [...new Set(data.map(item => item.examId))]
      }
    }).toArray()
    const result = []
    data.forEach(item => {
      const exist = exams.find(itema => itema.examId == item.examId && (!itema.schoolId || itema.schoolId == account.schoolId))
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