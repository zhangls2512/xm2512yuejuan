'use strict'
exports.main = async (event, configfilepath) => {
  const crypto = require('crypto')
  const { write } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.question) != 'string' || !/^data:image\/\w+;base64,/.test(requestdata.question)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的question参数'
    }
  }
  if (typeof (requestdata.answer) != 'string' || !/^data:image\/\w+;base64,/.test(requestdata.answer)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的answer参数'
    }
  }
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
    const questionid = crypto.randomUUID()
    const dir = readConfig(configfilepath, 'dataRootPath') + '/question/'
    write(dir + questionid + '-question', requestdata.question)
    write(dir + questionid + '-answer', requestdata.answer)
    await db.collection('question').insertOne({
      schoolId: account.schoolId,
      questionId: questionid,
      type: requestdata.type,
      difficulty: requestdata.difficulty,
      subject: requestdata.subject,
      grade: requestdata.grade,
      knowledgePoint: [...new Set(requestdata.knowledgePoint)],
      updateTime: Date.now()
    })
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}