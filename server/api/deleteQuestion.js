'use strict'
exports.main = async (event, configfilepath) => {
  const fs = require('fs')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
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
    const deleteres = await db.collection('question').deleteOne({
      schoolId: account.schoolId,
      questionId: requestdata.id
    })
    if (deleteres.deletedCount != 0) {
      const dir = readConfig(configfilepath, 'dataRootPath') + '/question/'
      fs.rmSync(dir + requestdata.id + '-question')
      fs.rmSync(dir + requestdata.id + '-answer')
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (deleteres.deletedCount == 0) {
      return {
        errCode: 400,
        errMsg: '题目不存在',
        errFix: '无修复建议'
      }
    }
  }
}