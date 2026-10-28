'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { fixtwo } = require('../util/scorereport')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    if (!examsubjectres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (examsubjectres.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    const examres = await db.collection('exam').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    let questionname
    if (account.type == 'admin' && account.schoolId == examres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('getMarkArbitrateRate'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('getMarkArbitrateRate'))) {
          if (!questionname) {
            questionname = []
          }
          questionname = questionname.concat(item.questionName)
        }
      }
    }
    if (!questionname) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    let twotimequestionnames = examsubjectres.markGroup.filter(item => item.time == 2).map(item => item.questionName).flat()
    let threetimequestionnames = examsubjectres.markGroup.filter(item => item.time == 3).map(item => item.questionName).flat()
    if (questionname != 'all') {
      twotimequestionnames = twotimequestionnames.filter(item => questionname.includes(item))
      threetimequestionnames = threetimequestionnames.filter(item => questionname.includes(item))
    }
    if (twotimequestionnames.length == 0 && threetimequestionnames.length == 0) {
      return {
        errCode: 0,
        errMsg: '成功',
        data: []
      }
    }
    const marklog = await db.collection('marklog').find({
      examId: requestdata.id,
      subject: requestdata.subject,
      type: 'system',
      firstMarkerAccount: {
        $ne: ''
      },
      secondMarkerAccount: {
        $ne: ''
      },
      $or: twotimequestionnames.map(item => {
        return {
          questionName: item
        }
      }).concat(threetimequestionnames.map(item => {
        return {
          questionName: item,
          thirdMarkerAccount: {
            $ne: ''
          }
        }
      }))
    }).toArray()
    const diffmap = {}
    examsubjectres.subjectiveQuestion.forEach(item => {
      diffmap[item.name] = item.arbitrateScoreDiff
    })
    const temp = {}
    marklog.forEach(item => {
      if (!temp[item.questionName]) {
        temp[item.questionName] = {}
      }
      if (!temp[item.questionName][item.firstMarkerAccount]) {
        temp[item.questionName][item.firstMarkerAccount] = {
          valid: 0,
          total: 0
        }
      }
      temp[item.questionName][item.firstMarkerAccount].total++
      if (item.minScoreDiff > diffmap[item.questionName]) {
        temp[item.questionName][item.firstMarkerAccount].valid++
      }
      if (!temp[item.questionName][item.secondMarkerAccount]) {
        temp[item.questionName][item.secondMarkerAccount] = {
          valid: 0,
          total: 0
        }
      }
      temp[item.questionName][item.secondMarkerAccount].total++
      if (item.minScoreDiff > diffmap[item.questionName]) {
        temp[item.questionName][item.secondMarkerAccount].valid++
      }
      if (item.thirdMarkerAccount) {
        if (!temp[item.questionName][item.thirdMarkerAccount]) {
          temp[item.questionName][item.thirdMarkerAccount] = {
            valid: 0,
            total: 0
          }
        }
        temp[item.questionName][item.thirdMarkerAccount].total++
        if (item.minScoreDiff > diffmap[item.questionName]) {
          temp[item.questionName][item.thirdMarkerAccount].valid++
        }
      }
    })
    const result = []
    Object.keys(temp).forEach(item => {
      const list = []
      Object.keys(temp[item]).forEach(itemb => {
        list.push({
          account: itemb,
          rate: fixtwo(temp[item][itemb].valid / temp[item][itemb].total) * 100
        })
      })
      result.push({
        questionName: item,
        list: list
      })
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}