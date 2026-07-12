'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
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
  if (!Array.isArray(requestdata.knowledgePoint) || !requestdata.knowledgePoint.every(item => typeof (item) == 'string' && item)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的knowledgePoint参数'
    }
  }
  let skip = 0
  let limit = 10
  if (Number.isInteger(requestdata.skip) && requestdata.skip >= 0) {
    skip = requestdata.skip
  }
  if (Number.isInteger(requestdata.limit) && requestdata.limit > 0 && requestdata.limit <= 10) {
    limit = requestdata.limit
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
    const data = await db.collection('question').find({
      schoolId: account.schoolId,
      type: requestdata.type,
      difficulty: requestdata.difficulty,
      subject: requestdata.subject,
      grade: requestdata.grade,
      knowledgePoint: {
        $all: [...new Set(requestdata.knowledgePoint)]
      }
    }, {
      projection: {
        _id: false,
        schoolId: false
      }
    }).sort({
      updateTime: -1
    }).skip(skip).limit(limit).toArray()
    const dir = readConfig(configfilepath, 'dataRootPath') + '/question/'
    data.forEach(item => {
      item.question = read(dir + item.questionId + '-question')
      item.answer = read(dir + item.questionId + '-answer')
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: data
    }
  }
}