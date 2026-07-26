'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
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
    const count = await db.collection('examsubject').countDocuments({
      answerOnline: true,
      endTime: {
        $gte: Date.now()
      },
      class: {
        $in: classids
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}