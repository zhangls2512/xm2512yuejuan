'use strict'
exports.main = async (event, configfilepath) => {
  const axios = require('axios')
  const fs = require('fs')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.question) != 'string' || !requestdata.question || requestdata.question.length > 100) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的question参数'
    }
  }
  if (typeof (requestdata.userId) != 'string' || !requestdata.userId) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的userId参数'
    }
  }
  let answer = '针对您这个问题，我暂时还无法进行回答，请换一个问题吧。或者联系人工客服咨询。人工客服联系方式：gerenyinsi_z07x17m（微信）、2300990296（QQ）、2300990296@qq.com（邮箱）'
  async function answerbyai() {
    const yuanqiappid = readConfig(configfilepath, 'yuanqiAppid')
    const yuanqiappkey = readConfig(configfilepath, 'yuanqiAppkey')
    if (yuanqiappid && yuanqiappkey) {
      try {
        const res = await axios.post('https://yuanqi.tencent.com/openapi/v1/agent/chat/completions', {
          assistant_id: yuanqiappid,
          user_id: requestdata.userId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: requestdata.question
                }
              ]
            }
          ]
        }, {
          headers: {
            Authorization: 'Bearer ' + yuanqiappkey
          }
        })
        const answers = res.data.choices
        if (answers.length > 0) {
          answer = answers[0].message.content
        }
      } catch (err) {
        if (readConfig(configfilepath, 'saveErrorLog')) {
          fs.writeFileSync(readConfig(configfilepath, 'logRootPath') + '/error-' + Date.now() + '.log', JSON.stringify(err))
        }
      }
    }
  }
  const allowanonymoususeruseaiassistant = readConfig(configfilepath, 'allowAnonymousUserUseAiAssistant')
  if (!allowanonymoususeruseaiassistant) {
    const res = await require('../util/authcheck').main(event.headers, configfilepath)
    if (res.errCode == 0) {
      await answerbyai()
    }
  }
  if (allowanonymoususeruseaiassistant) {
    await answerbyai()
  }
  return {
    errCode: 0,
    errMsg: '成功',
    data: answer
  }
}