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
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
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
      const question = examsubjectres.objectiveQuestion.map(item => item.name)
      const item = {
        questionName: '客观题',
        progress: 0,
        finished: 0,
        total: 0,
        detail: []
      }
      const statres = await db.collection('marklog').aggregate([
        {
          $match: {
            examId: requestdata.id,
            subject: requestdata.subject,
            type: 'system',
            questionName: {
              $in: question
            }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: 1
            },
            finished: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$finished', true]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray()
      const stat = statres[0] ?? {
        finished: 0,
        total: 0
      }
      item.detail.push({
        name: '已识别量',
        count: stat.finished
      })
      item.detail.push({
        name: '总量',
        count: stat.total
      })
      item.finished = stat.finished
      item.total = stat.total
      item.progress = percent(item.finished, item.total)
      result.list.push(item)
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
    const scorediffcase = {
      $switch: {
        branches: examsubjectres.subjectiveQuestion.map(item => ({
          case: {
            $eq: ['$questionName', item.name]
          },
          then: item.arbitrateScoreDiff
        })),
        default: 0
      }
    }
    const stats = await db.collection('marklog').aggregate([
      {
        $match: {
          examId: requestdata.id,
          subject: requestdata.subject,
          type: 'system',
          questionName: {
            $in: questionname
          },
          updateMarkerAccount: ''
        }
      },
      {
        $addFields: {
          arbitrateScoreDiff: scorediffcase
        }
      },
      {
        $group: {
          _id: '$questionName',
          firstFinished: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ['$questionReason', '']
                    },
                    {
                      $ne: ['$firstMarkerAccount', '']
                    }
                  ]
                },
                1, 0
              ]
            }
          },
          firstTotal: {
            $sum: {
              $cond: [
                {
                  $eq: ['$questionReason', '']
                },
                1,
                0
              ]
            }
          },
          secondFinished: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ['$questionReason', '']
                    },
                    {
                      $ne: ['$secondMarkerAccount', '']
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          thirdFinished: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ['$questionReason', '']
                    },
                    {
                      $ne: ['$thirdMarkerAccount', '']
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          thirdPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ['$questionReason', '']
                    },
                    {
                      $eq: ['$thirdMarkerAccount', '']
                    },
                    {
                      $eq: ['$arbitrateMarkerAccount', '']
                    },
                    {
                      $gt: ['$minScoreDiff', '$arbitrateScoreDiff']
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          arbitrateFinished: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ['$questionReason', '']
                    },
                    {
                      $ne: ['$arbitrateMarkerAccount', '']
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          arbitratePending: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        {
                          $eq: ['$questionReason', '']
                        },
                        {
                          $eq: ['$arbitrateMarkerAccount', '']
                        },
                        {
                          $gt: ['$minScoreDiff', '$arbitrateScoreDiff']
                        }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          questionFinished: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: ['$questionMarkerAccount', '']
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          questionTotal: {
            $sum: {
              $cond: [
                {
                  $ne: ['$questionReason', '']
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray()
    const questionnamemap = {}
    stats.forEach(item => {
      questionnamemap[item._id] = item
    })
    const questiontimemap = {}
    questionname.forEach(item => {
      if (!questiontimemap[item]) {
        const markgroup = examsubjectres.markGroup.find(i => i.questionName.includes(item))
        markgroup.questionName.forEach(item => {
          questiontimemap[item] = {
            time: markgroup.time,
            seconeMarkPercent: markgroup.seconeMarkPercent
          }
        })
      }
      const qstat = questionnamemap[item] ?? {
        firstFinished: 0,
        firstTotal: 0,
        secondFinished: 0,
        thirdFinished: 0,
        thirdPending: 0,
        arbitrateFinished: 0,
        arbitratePending: 0,
        questionFinished: 0,
        questionTotal: 0,
      }
      const time = questiontimemap[item].time
      if (time == 1) {
        const stat = {
          questionName: item,
          progress: 0,
          finished: 0,
          total: 0,
          detail: [
            {
              name: '一评已阅量',
              count: qstat.firstFinished
            },
            {
              name: '一评总量',
              count: qstat.firstTotal
            },
            {
              name: '问题卷已处理量',
              count: qstat.questionFinished
            },
            {
              name: '问题卷总量',
              count: qstat.questionTotal
            }
          ]
        }
        stat.finished = qstat.firstFinished + qstat.questionFinished
        stat.total = qstat.firstTotal + qstat.questionTotal
        totalfinished += stat.finished
        totalall += stat.total
        stat.progress = percent(stat.finished, stat.total)
        result.list.push(stat)
      }
      if (time == 2) {
        const stat = {
          questionName: item,
          progress: 0,
          finished: 0,
          total: 0,
          detail: [
            {
              name: '一评已阅量',
              count: qstat.firstFinished
            },
            {
              name: '一评总量',
              count: qstat.firstTotal
            },
            {
              name: '二评已阅量',
              count: qstat.secondFinished
            },
            {
              name: '二评总量',
              count: Math.max(Math.round(qstat.firstTotal * questiontimemap[item].secondMarkPercent), qstat.secondFinished)
            },
            {
              name: '仲裁已阅量',
              count: qstat.arbitrateFinished
            },
            {
              name: '仲裁总量',
              count: qstat.arbitrateFinished + qstat.arbitratePending
            },
            {
              name: '问题卷已处理量',
              count: qstat.questionFinished
            },
            {
              name: '问题卷总量',
              count: qstat.questionTotal
            }
          ]
        }
        stat.finished = qstat.firstFinished + qstat.secondFinished + qstat.arbitrateFinished + qstat.questionFinished
        stat.total = qstat.firstTotal + stat.detail[3].count + stat.detail[5].count + qstat.questionTotal
        totalfinished += stat.finished
        totalall += stat.total
        stat.progress = percent(stat.finished, stat.total)
        result.list.push(stat)
      }
      if (time == 3) {
        const stat = {
          questionName: item,
          progress: 0,
          finished: 0,
          total: 0,
          detail: [
            {
              name: '一评已阅量',
              count: qstat.firstFinished
            },
            {
              name: '一评总量',
              count: qstat.firstTotal
            },
            {
              name: '二评已阅量',
              count: qstat.secondFinished
            },
            {
              name: '二评总量',
              count: Math.max(Math.round(qstat.firstTotal * questiontimemap[item].secondMarkPercent), qstat.secondFinished)
            },
            {
              name: '三评已阅量',
              count: qstat.thirdFinished
            },
            {
              name: '三评总量',
              count: qstat.thirdFinished + qstat.thirdPending
            },
            {
              name: '仲裁已阅量',
              count: qstat.arbitrateFinished
            },
            {
              name: '仲裁总量',
              count: qstat.arbitrateFinished + qstat.arbitratePending - qstat.thirdPending
            },
            {
              name: '问题卷已处理量',
              count: qstat.questionFinished
            },
            {
              name: '问题卷总量',
              count: qstat.questionTotal
            }
          ]
        }
        stat.finished = qstat.firstFinished + qstat.secondFinished + qstat.thirdFinished + qstat.arbitrateFinished + qstat.questionFinished
        stat.total = qstat.firstTotal + stat.detail[3].count + stat.detail[5].count + stat.detail[7].count + qstat.questionTotal
        totalfinished += stat.finished
        totalall += stat.total
        stat.progress = percent(stat.finished, stat.total)
        result.list.push(stat)
      }
    })
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