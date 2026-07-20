'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { cropImage } = require('../util/image')
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
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (!['normal', 'arbitrate'].includes(requestdata.type)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的type参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'teacher') {
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
    if (examsubjectres.markStatus == 'paused') {
      return {
        errCode: 400,
        errMsg: '阅卷未开始',
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
    const markgroup = examsubjectres.markGroup.find(item => item.name == requestdata.name)
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '阅卷组不存在',
        errFix: '无修复建议'
      }
    }
    const member = markgroup.member.find(item => item.account == account.account)
    if (requestdata.type == 'normal' && !member) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    if (requestdata.type == 'arbitrate') {
      if (markgroup.time == 1) {
        return {
          errCode: 400,
          errMsg: '阅卷组为单评无需仲裁',
          errFix: '无修复建议'
        }
      }
      if (!markgroup.arbitrator.includes(account.account)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
    }
    if (requestdata.type == 'normal') {
      const quota = [Infinity, 0]
      const count = await db.collection('marklog').countDocuments({
        examId: requestdata.id,
        subject: requestdata.subject,
        questionName: {
          $in: markgroup.questionName
        },
        markerAccount: account.account,
        type: {
          $in: ['first', 'second', 'third']
        }
      })
      if (!member.allowExceedQuota) {
        const yu = member.quota * markgroup.questionName.length - count
        quota[0] = yu > 0 ? yu : 0
      }
      if (markgroup.consistencyCheckPercent > 0) {
        const check = await db.collection('marklog').find({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: {
            $in: markgroup.questionName
          },
          markerAccount: account.account,
          type: 'consistencycheck'
        }).toArray()
        const yu = Math.round(count * markgroup.consistencyCheckPercent) - check.map(item => item.marklogId).flat().length
        quota[1] = yu > 0 ? yu : 0
      }
      let select
      if (quota[0] > 0 && quota[1] > 0) {
        select = Math.random() < 0.5 ? 'normal' : 'consistencycheck'
      } else {
        if (quota[0] > 0) {
          select = 'normal'
        }
        if (quota[1] > 0) {
          select = 'consistencycheck'
        }
      }
      if (!select) {
        return {
          errCode: 400,
          errMsg: '无待阅卷任务',
          errFix: '无修复建议'
        }
      }
      if (select == 'normal') {
        let data = []
        if (markgroup.time == 1) {
          data = await db.collection('marklog').aggregate([
            {
              $match: {
                examId: requestdata.id,
                subject: requestdata.subject,
                questionName: {
                  $in: markgroup.questionName
                },
                markerAccount: account.account,
                type: 'system',
                firstMarkerAccount: '',
                questionReason: ''
              }
            },
            {
              $sample: {
                size: 1
              }
            }
          ]).toArray()
        } else {
          let secondyu = 1
          if (markgroup.secondMarkPercent != 1) {
            const allcount = await db.collection('marklog').countDocuments({
              examId: requestdata.id,
              subject: requestdata.subject,
              questionName: {
                $in: markgroup.questionName
              },
              questionReason: ''
            })
            const finishcount = await db.collection('marklog').countDocuments({
              examId: requestdata.id,
              subject: requestdata.subject,
              questionName: {
                $in: markgroup.questionName
              },
              secondMarkerAccount: {
                $ne: ''
              },
              questionReason: ''
            })
            const cha = Math.round(allcount * markgroup.secondMarkPercent) - finishcount
            secondyu = cha < 0 ? 0 : cha
          }
          if (markgroup.time == 2) {
            if (secondyu > 0) {
              data = await db.collection('marklog').aggregate([
                {
                  $match: {
                    examId: requestdata.id,
                    subject: requestdata.subject,
                    questionName: {
                      $in: markgroup.questionName
                    },
                    questionReason: '',
                    type: 'system',
                    $or: [
                      {
                        firstMarkerAccount: ''
                      },
                      {
                        firstMarkerAccount: {
                          $nin: ['', account.account]
                        },
                        secondMarkerAccount: ''
                      }
                    ]
                  }
                },
                {
                  $sample: {
                    size: 1
                  }
                }
              ]).toArray()
            }
            if (secondyu == 0) {
              data = await db.collection('marklog').aggregate([
                {
                  $match: {
                    examId: requestdata.id,
                    subject: requestdata.subject,
                    questionName: {
                      $in: markgroup.questionName
                    },
                    type: 'system',
                    firstMarkerAccount: '',
                    questionReason: ''
                  }
                },
                {
                  $sample: {
                    size: 1
                  }
                }
              ]).toArray()
            }
          }
          if (markgroup.time == 3) {
            const sanping = {
              examId: requestdata.id,
              subject: requestdata.subject,
              type: 'system',
              firstMarkerAccount: {
                $nin: ['', account.account]
              },
              secondMarkerAccount: {
                $nin: ['', account.account]
              },
              thirdMarkerAccount: '',
              questionReason: '',
              $or: markgroup.questionName.map(item => {
                return {
                  questionName: item,
                  minScoreDiff: {
                    $gt: examsubjectres.subjectiveQuestion.find(q => q.name == item).arbitrateScoreDiff
                  }
                }
              })
            }
            if (secondyu > 0) {
              data = await db.collection('marklog').aggregate([
                {
                  $match: {
                    $or: [
                      {
                        examId: requestdata.id,
                        subject: requestdata.subject,
                        questionName: {
                          $in: markgroup.questionName
                        },
                        type: 'system',
                        questionReason: '',
                        $or: [
                          {
                            firstMarkerAccount: ''
                          },
                          {
                            firstMarkerAccount: {
                              $nin: ['', account.account]
                            },
                            secondMarkerAccount: ''
                          }
                        ]
                      }
                    ].cancat([sanping])
                  }
                },
                {
                  $sample: {
                    size: 1
                  }
                }
              ]).toArray()
            }
            if (secondyu == 0) {
              data = await db.collection('marklog').aggregate([
                {
                  $match: {
                    $or: [
                      {
                        examId: requestdata.id,
                        subject: requestdata.subject,
                        questionName: {
                          $in: markgroup.questionName
                        },
                        type: 'system',
                        firstMarkerAccount: '',
                        questionReason: ''
                      }
                    ].concat([sanping])
                  }
                },
                {
                  $sample: {
                    size: 1
                  }
                }
              ]).toArray()
            }
          }
        }
        if (data.length == 0) {
          return {
            errCode: 400,
            errMsg: '无待阅卷任务',
            errFix: '无修复建议'
          }
        }
        const result = {
          answerImage: [],
          marklogList: [],
          consistencyCheck: false
        }
        const marklog = data[0]
        if (!examsubjectres.answerOnline) {
          const answer = await db.collection('answer').findOne({
            examId: requestdata.id,
            subject: requestdata.subject,
            studentAccount: marklog.studentAccount
          })
          if (answer) {
            const volume = examsubjectres.volume.find(item => item.name == answer.answer.volume)
            if (volume) {
              const pages = volume.page
              for (let i = 0; i < pages.length; i++) {
                const coord = pages[i].find(item => item.markGroupName == requestdata.name)
                if (coord && coord.coord) {
                  for (let j = 0; j < coord.coord.length; j++) {
                    const cropimagebase64 = await cropImage(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + i), coord.coord[j])
                    result.answerImage.push(cropimagebase64)
                  }
                }
              }
            }
          }
        }
        if (examsubjectres.answerOnline) {
          result.answerImage.push(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + requestdata.name))
        }
        if (marklog.firstMarkerAccount && marklog.secondMarkerAccount) {
          result.marklogList.push({
            id: marklog.marklogId,
            questionName: marklog.questionName,
            stepScore: examsubjectres.subjectiveQuestion.find(item => item.name == marklog.questionName).stepScore
          })
        } else {
          const list = await db.collection('marklog').find({
            examId: requestdata.id,
            subject: requestdata.subject,
            questionName: {
              $in: markgroup.questionName
            },
            studentAccount: marklog.studentAccount,
            type: 'system',
            questionReason: '',
            $or: [
              {
                firstMarkerAccount: ''
              },
              {
                firstMarkerAccount: {
                  $nin: ['', account.account]
                },
                secondMarkerAccount: ''
              }
            ]
          }).toArray()
          result.marklogList = list.map(item => {
            return {
              id: item.marklogId,
              questionName: item.questionName,
              stepScore: examsubjectres.subjectiveQuestion.find(q => q.name == item.questionName).stepScore
            }
          }).sort((a, b) => a.questionName.localeCompare(b.questionName))
        }
        return {
          errCode: 0,
          errMsg: '成功',
          data: result
        }
      }
      if (select == 'consistencycheck') {
        const data = await db.collection('marklog').aggregate([
          {
            $match: {
              examId: requestdata.id,
              subject: requestdata.subject,
              markerAccount: account.account,
              questionName: {
                $in: markgroup.questionName
              },
              consistencyChecked: false,
              type: {
                $in: ['first', 'second', 'third']
              }
            }
          },
          {
            $sample: {
              size: 1
            }
          }
        ]).toArray()
        const list = await db.collection('marklog').find({
          examId: requestdata.id,
          subject: requestdata.subject,
          questionName: {
            $in: markgroup.questionName
          },
          studentAccount: data[0].studentAccount,
          type: 'system',
          $or: [
            {
              firstMarkerAccount: account.account
            },
            {
              secondMarkerAccount: account.account
            },
            {
              thirdMarkerAccount: account.account
            }
          ]
        }).toArray()
        const result = {
          answerImage: [],
          marklogList: [],
          consistencyCheck: true
        }
        const marklog = data[0]
        if (!examsubjectres.answerOnline) {
          const answer = await db.collection('answer').findOne({
            examId: requestdata.id,
            subject: requestdata.subject,
            studentAccount: marklog.studentAccount
          })
          if (answer) {
            const volume = examsubjectres.volume.find(item => item.name == answer.answer.volume)
            if (volume) {
              const pages = volume.page
              for (let i = 0; i < pages.length; i++) {
                const coord = pages[i].find(item => item.markGroupName == requestdata.name)
                if (coord && coord.coord) {
                  for (let j = 0; j < coord.coord.length; j++) {
                    const cropimagebase64 = await cropImage(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + i), coord.coord[j])
                    result.answerImage.push(cropimagebase64)
                  }
                }
              }
            }
          }
        }
        if (examsubjectres.answerOnline) {
          result.answerImage.push(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + requestdata.name))
        }
        result.marklogList = list.map(item => {
          return {
            id: item.marklogId,
            questionName: item.questionName,
            stepScore: examsubjectres.subjectiveQuestion.find(q => q.name = item.questionName).stepScore
          }
        }).sort((a, b) => a.questionName.localeCompare(b.questionName))
        return {
          errCode: 0,
          errMsg: '成功',
          data: result
        }
      }
    }
    if (requestdata.type == 'arbitrate') {
      let data
      if (markgroup.time == 2) {
        data = await db.collection('marklog').aggregate([
          {
            $match: {
              examId: requestdata.id,
              subject: requestdata.subject,
              type: 'system',
              firstMarkerAccount: {
                $nin: ['', account.account]
              },
              secondMarkerAccount: {
                $nin: ['', account.account]
              },
              thirdMarkerAccount: {
                $ne: account.account
              },
              arbitrateMarkerAccount: '',
              questionReason: '',
              $or: markgroup.questionName.map(item => {
                return {
                  questionName: item,
                  minScoreDiff: {
                    $gt: examsubjectres.subjectiveQuestion.find(q => q.name == item).arbitrateScoreDiff
                  }
                }
              })
            }
          },
          {
            $sample: {
              size: 1
            }
          }
        ]).toArray()
      }
      if (markgroup.time == 3) {
        data = await db.collection('marklog').aggregate([
          {
            $match: {
              examId: requestdata.id,
              subject: requestdata.subject,
              type: 'system',
              firstMarkerAccount: {
                $nin: ['', account.account]
              },
              secondMarkerAccount: {
                $nin: ['', account.account]
              },
              thirdMarkerAccount: {
                $nin: ['', account.account]
              },
              arbitrateMarkerAccount: '',
              questionReason: '',
              $or: markgroup.questionName.map(item => {
                return {
                  questionName: item,
                  minScoreDiff: {
                    $gt: examsubjectres.subjectiveQuestion.find(q => q.name == item).arbitrateScoreDiff
                  }
                }
              })
            }
          },
          {
            $sample: {
              size: 1
            }
          }
        ]).toArray()
      }
      if (data.length == 0) {
        return {
          errCode: 400,
          errMsg: '无待仲裁任务',
          errFix: '无修复建议'
        }
      }
      const marklog = data[0]
      const result = {
        answerImage: [],
        marklogList: [],
        scoreHistory: {
          first: marklog.firstMarkStepScore,
          second: marklog.secondMarkStepScore,
          third: marklog.thirdMarkStepScore
        }
      }
      if (!examsubjectres.answerOnline) {
        const answer = await db.collection('answer').findOne({
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: marklog.studentAccount
        })
        if (answer) {
          const volume = examsubjectres.volume.find(item => item.name == answer.answer.volume)
          if (volume) {
            const pages = volume.page
            for (let i = 0; i < pages.length; i++) {
              const coord = pages[i].find(item => item.markGroupName == requestdata.name)
              if (coord && coord.coord) {
                for (let j = 0; j < coord.coord.length; j++) {
                  const cropimagebase64 = await cropImage(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + i), coord.coord[j])
                  result.answerImage.push(cropimagebase64)
                }
              }
            }
          }
        }
      }
      if (examsubjectres.answerOnline) {
        result.answerImage.push(read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + marklog.studentAccount + '/' + requestdata.name))
      }
      result.marklogList.push({
        id: marklog.marklogId,
        questionName: marklog.questionName,
        stepScore: examsubjectres.subjectiveQuestion.find(item => item.name == marklog.questionName).stepScore
      })
      return {
        errCode: 0,
        errMsg: '成功',
        data: result
      }
    }
  }
}