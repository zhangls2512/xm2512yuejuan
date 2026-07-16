'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
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
    const examgetres = await db.collection('exam').findOne({
      examId: requestdata.id
    })
    if (!examgetres) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (examgetres.schoolId && examgetres.schoolId != account.schoolId) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    let questionname
    if (account.type == 'admin' && account.schoolId == examgetres.schoolId) {
      questionname = 'all'
    }
    if (examsubjectres.admin.find(item => item.account == account.account && item.permission.includes('getMarkProgress'))) {
      questionname = 'all'
    }
    if (!questionname) {
      for (let i = 0; i < examsubjectres.markGroup.length; i++) {
        const item = examsubjectres.markGroup[i]
        if (item.admin.find(item => item.account == account.account && item.permission.includes('getMarkProgress'))) {
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
    const result = {
      progress: questionname == 'all' ? true : false,
      finished: questionname == 'all' ? true : false,
      total: questionname == 'all' ? true : false,
      list: []
    }
    let totalfinished = 0
    let totalall = 0
    if (questionname == 'all') {
      questionname = examsubjectres.subjectiveQuestion.map(item => item.name)
    }
    function percent(finished, total) {
      if (finished == total) {
        return 100
      }
      const p = Math.round(((finished / total) * 1000))
      if (p == 1000) {
        return Math.floor(((finished / total) * 1000)) / 10
      }
      return p / 10
    }
    for (let i = 0; i < questionname.length; i++) {
      const question = examsubjectres.subjectiveQuestion.find(item => item.name == questionname[i])
      const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(questionname[i]))
      const item = {
        questionName: questionname[i],
        progress: 0,
        finished: 0,
        total: 0,
        detail: []
      }
      let itemtotalfinished = 0
      let itemtotalall = 0
      if (markgroup.time == 1) {
        const a = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          questionReason: ''
        })
        itemtotalfinished += a
        totalfinished += a
        item.detail.push({
          name: '一评已阅量',
          count: a
        })
        const b = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: ''
        })
        itemtotalall += b
        totalall += b
        item.detail.push({
          name: '一评总量',
          count: b
        })
        const c = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionMarkerAccount: {
            $ne: ''
          },
          questionReason: {
            $ne: ''
          }
        })
        itemtotalfinished += c
        totalfinished += c
        item.detail.push({
          name: '问题卷已处理量',
          count: c
        })
        const d = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: {
            $ne: ''
          }
        })
        itemtotalall += d
        totalall += d
        item.detail.push({
          name: '问题卷总量',
          count: d
        })
        item.finished = itemtotalfinished
        item.total = itemtotalall
        item.progress = percent(item.finished, item.total)
      }
      if (markgroup.time == 2) {
        const a = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          questionReason: ''
        })
        itemtotalfinished += a
        totalfinished += a
        item.detail.push({
          name: '一评已阅量',
          count: a
        })
        const b = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: ''
        })
        itemtotalall += b
        totalall += b
        item.detail.push({
          name: '一评总量',
          count: b
        })
        const e = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          secondMarkerAccount: {
            $ne: ''
          },
          questionReason: ''
        })
        itemtotalfinished += e
        totalfinished += e
        item.detail.push({
          name: '二评已阅量',
          count: e
        })
        itemtotalall += b
        totalall += b
        item.detail.push({
          name: '二评总量',
          count: b
        })
        const f = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          arbitrateMarkerAccount: {
            $ne: ''
          },
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalfinished += f
        totalfinished += f
        item.detail.push({
          name: '仲裁已阅量',
          count: f
        })
        const g = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          secondMarkerAccount: {
            $ne: ''
          },
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalall += g
        totalall += g
        item.detail.push({
          name: '仲裁总量',
          count: g
        })
        const c = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionMarkerAccount: {
            $ne: ''
          },
          questionReason: {
            $ne: ''
          }
        })
        itemtotalfinished += c
        totalfinished += c
        item.detail.push({
          name: '问题卷已处理量',
          count: c
        })
        const d = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: {
            $ne: ''
          }
        })
        itemtotalall += d
        totalall += d
        item.detail.push({
          name: '问题卷总量',
          count: d
        })
        item.finished = itemtotalfinished
        item.total = itemtotalall
        item.progress = percent(item.finished, item.total)
      }
      if (markgroup.time == 3) {
        const a = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          questionReason: ''
        })
        itemtotalfinished += a
        totalfinished += a
        item.detail.push({
          name: '一评已阅量',
          count: a
        })
        const b = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: ''
        })
        itemtotalall += b
        totalall += b
        item.detail.push({
          name: '一评总量',
          count: b
        })
        const e = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          secondMarkerAccount: {
            $ne: ''
          },
          questionReason: ''
        })
        itemtotalfinished += e
        totalfinished += e
        item.detail.push({
          name: '二评已阅量',
          count: e
        })
        itemtotalall += b
        totalall += b
        item.detail.push({
          name: '二评总量',
          count: b
        })
        const h = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          thirdMarkerAccount: {
            $ne: ''
          },
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalfinished += h
        totalfinished += h
        item.detail.push({
          name: '三评已阅量',
          count: h
        })
        const j = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          secondMarkerAccount: {
            $ne: ''
          },
          thirdMarkerAccount: {
            $ne: ''
          },
          arbitrateMarkerAccount: '',
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalall += j
        totalall += j
        item.detail.push({
          name: '三评总量',
          count: j
        })
        const f = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          arbitrateMarkerAccount: {
            $ne: ''
          },
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalfinished += f
        totalfinished += f
        item.detail.push({
          name: '仲裁已阅量',
          count: f
        })
        const g = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          firstMarkerAccount: {
            $ne: ''
          },
          secondMarkerAccount: {
            $ne: ''
          },
          thirdMarkerAccount: {
            $ne: ''
          },
          questionReason: '',
          minScoreDiff: {
            $gt: question.arbitrateScoreDiff
          }
        })
        itemtotalall += g
        totalall += g
        item.detail.push({
          name: '仲裁总量',
          count: g
        })
        const c = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionMarkerAccount: {
            $ne: ''
          },
          questionReason: {
            $ne: ''
          }
        })
        itemtotalfinished += c
        totalfinished += c
        item.detail.push({
          name: '问题卷已处理量',
          count: c
        })
        const d = await db.collection('marklog').countDocuments({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: questionname[i],
          type: 'system',
          questionReason: {
            $ne: ''
          }
        })
        itemtotalall += d
        totalall += d
        item.detail.push({
          name: '问题卷总量',
          count: d
        })
        item.finished = itemtotalfinished
        item.total = itemtotalall
        item.progress = percent(item.finished, item.total)
      }
      result.list.push(item)
    }
    if (result.progress) {
      result.finished = totalfinished
      result.total = totalall
      result.progress = percent(result.finished, result.total)
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}