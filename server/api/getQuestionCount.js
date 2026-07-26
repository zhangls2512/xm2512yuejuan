'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.type) != 'string' || !requestdata.type) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
    }
  }
  if (typeof (requestdata.difficulty) != 'number' || requestdata.difficulty < 0) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的difficulty参数'
    }
  }
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  if (typeof (requestdata.grade) != 'string') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的grade参数'
    }
  }
  if (!Array.isArray(requestdata.knowledgepoint) || requestdata.knowledgepoint.length == 0 || !requestdata.knowledgepoint.every(item => typeof (item) == 'string' && item)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的knowledgepoint参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const count = await db.collection('question').countDocuments({
      schoolId: account.schoolId,
      type: requestdata.type,
      difficulty: requestdata.difficulty,
      subject: requestdata.subject,
      grade: requestdata.grade,
      knowledgepoint: {
        $all: [...new Set(requestdata.knowledgepoint)]
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      count: count
    }
  }
}