'use strict'
exports.main = async (event, configfilepath) => {
  const { read, write } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const { getImageInfo } = require('../util/image')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (!Array.isArray(requestdata.stepScore) || !requestdata.stepScore.every(item => typeof (item) == 'number' && item >= 0)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的stepScore参数'
    }
  }
  if (!Array.isArray(requestdata.traceImage) || !requestdata.traceImage.every(item => typeof (item) == 'string' && (!item || /^data:image\/\w+;base64,/.test(item)))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的traceImage参数'
    }
  }
  if (typeof (requestdata.excellent) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的excellent参数'
    }
  }
  if (typeof (requestdata.typicalMistake) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的typicalMistake参数'
    }
  }
  if (typeof (requestdata.doubtful) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的doubtful参数'
    }
  }
  if (typeof (requestdata.consistencyCheck) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的consistencyCheck参数'
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
    const marklogres = await db.collection('marklog').findOne({
      marklogId: requestdata.id,
      type: 'system'
    })
    if (!marklogres) {
      return {
        errCode: 400,
        errMsg: '阅卷记录不存在',
        errFix: '无修复建议'
      }
    }
    if (marklogres.questionReason && !requestdata.consistencyCheck) {
      return {
        errCode: 403,
        errMsg: '无权限阅问题卷',
        errFix: '无修复建议'
      }
    }
    const examsubjectres = await db.collection('examsubject').findOne({
      examId: marklogres.examId,
      name: marklogres.subject
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
    const question = examsubjectres.subjectiveQuestion.find(item => item.name == marklogres.questionName)
    if (requestdata.stepScore.length != question.stepScore.length || !requestdata.stepScore.every((item, index) => question.stepScore[index].includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的stepScore参数'
      }
    }
    const markgroup = examsubjectres.markGroup.find(item => item.questionName.includes(marklogres.questionName))
    if (!markgroup) {
      return {
        errCode: 400,
        errMsg: '阅卷组不存在',
        errFix: '无修复建议'
      }
    }
    const member = markgroup.member.find(item => item.account == account.account)
    const isarbitrator = markgroup.arbitrator && markgroup.arbitrator.includes(account.account)
    if (!member && !isarbitrator) {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: marklogres.examId
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
    function sum(arr) {
      return arr.reduce((sum, num) => sum + num, 0)
    }
    if (!requestdata.consistencyCheck) {
      if (marklogres.thirdMarkerAccount && (marklogres.thirdMarkerAccount != account.account || !member)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (marklogres.arbitrateMarkerAccount && (marklogres.arbitrateMarkerAccount != account.account || !isarbitrator)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      function average(a, b) {
        return a.map((item, index) => (item + b[index]) / 2)
      }
      function sanping(a, b, c) {
        const asum = sum(a)
        const bsum = sum(b)
        const csum = sum(c)
        const pairs = [
          {
            diff: Math.abs(asum - bsum),
            finalstepscore: average(a, b),
            sum: asum + bsum
          },
          {
            diff: Math.abs(asum - csum),
            finalstepscore: average(a, c),
            sum: asum + csum
          },
          {
            diff: Math.abs(bsum - csum),
            finalstepscore: average(b, c),
            sum: bsum + csum
          }
        ]
        pairs.sort((a, b) => {
          if (a.diff !== b.diff) {
            return a.diff - b.diff
          }
          return b.sum - a.sum
        })
        return {
          minscorediff: pairs[0].diff,
          finalstepscore: pairs[0].finalstepscore
        }
      }
      let type
      let marktype
      let minscorediff = marklogres.minScoreDiff
      let finalstepscore = marklogres.finalStepScore
      if (marklogres.arbitrateMarkerAccount == account.account) {
        type = 'updatearbitrate'
        marktype = 'arbitrate'
        finalstepscore = requestdata.stepScore
      }
      if (marklogres.thirdMarkerAccount == account.account) {
        type = 'updatethird'
        marktype = 'third'
        const res = sanping(marklogres.firstMarkStepScore, marklogres.secondMarkStepScore, requestdata.stepScore)
        minscorediff = res.minscorediff
        finalstepscore = res.finalstepscore
      }
      if (marklogres.secondMarkerAccount == account.account && member) {
        type = 'updatesecond'
        marktype = 'second'
        const firstsum = sum(marklogres.firstMarkStepScore)
        const secondsum = sum(requestdata.stepScore)
        minscorediff = Math.abs(secondsum - firstsum)
        finalstepscore = average(marklogres.firstMarkStepScore, requestdata.stepScore)
      }
      if (marklogres.firstMarkerAccount == account.account && member) {
        type = 'updatefirst'
        marktype = 'first'
        if (!marklogres.secondMarkerAccount) {
          finalstepscore = requestdata.stepScore
        }
        if (marklogres.secondMarkerAccount) {
          const firstsum = sum(requestdata.stepScore)
          const secondsum = sum(marklogres.secondMarkStepScore)
          minscorediff = Math.abs(secondsum - firstsum)
          finalstepscore = average(marklogres.secondMarkStepScore, requestdata.stepScore)
        }
      }
      if (!type) {
        if (!marklogres.firstMarkerAccount && member) {
          type = 'newfirst'
          marktype = 'first'
          finalstepscore = requestdata.stepScore
        }
        if (!['', account.account].includes(marklogres.firstMarkerAccount) && !marklogres.secondMarkerAccount && markgroup.time >= 2 && member) {
          type = 'newsecond'
          marktype = 'second'
          const firstsum = sum(marklogres.firstMarkStepScore)
          const secondsum = sum(requestdata.stepScore)
          minscorediff = Math.abs(secondsum - firstsum)
          finalstepscore = average(marklogres.firstMarkStepScore, requestdata.stepScore)
        }
        if (!['', account.account].includes(marklogres.firstMarkerAccount) && !['', account.account].includes(marklogres.secondMarkerAccount) && markgroup.time == 3 && marklogres.minScoreDiff > question.arbitrateScoreDiff && member) {
          type = 'newthird'
          marktype = 'third'
          const res = sanping(marklogres.firstMarkStepScore, marklogres.secondMarkStepScore, requestdata.stepScore)
          minscorediff = res.minscorediff
          finalstepscore = res.finalstepscore
        }
        if (!['', account.account].includes(marklogres.firstMarkerAccount) && !['', account.account].includes(marklogres.secondMarkerAccount) && markgroup.time >= 2 && marklogres.minScoreDiff > question.arbitrateScoreDiff && isarbitrator) {
          if (!marklogres.thirdMarkerAccount || marklogres.thirdMarkerAccount != account.account) {
            if (markgroup.time == 2 || (markgroup.time == 3 && marklogres.thirdMarkerAccount)) {
              type = 'newarbitrate'
              marktype = 'arbitrate'
              finalstepscore = requestdata.stepScore
            }
          }
        }
      }
      if (!type) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (!examsubjectres.answerOnline) {
        let coordarr = []
        const answer = await db.collection('answer').findOne({
          examId: marklogres.examId,
          subject: marklogres.subject,
          studentAccount: marklogres.studentAccount
        })
        if (answer) {
          const volume = examsubjectres.volume.find(item => item.name == answer.answer.volume)
          if (volume) {
            const pages = volume.pages
            for (let i = 0; i < pages.length; i++) {
              const coord = pages[i].find(item => item.markGroupName == markgroup.name)
              if (coord && coord.coord) {
                coordarr = coordarr.concat(coord.coord)
              }
            }
          }
        }
        if (requestdata.traceImage.length != coordarr.length) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        for (let i = 0; i < coordarr.length; i++) {
          const coord = coordarr[i]
          const traceimage = requestdata.traceImage[i]
          if (!traceimage) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的traceImage参数'
            }
          }
          const traceinfo = await getImageInfo(traceimage)
          if (!traceinfo || traceinfo.height != coord[3] - coord[1] || traceinfo.width != coord[2] - coord[0]) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的traceImage参数'
            }
          }
        }
      }
      if (examsubjectres.answerOnline) {
        if (requestdata.traceImage.length != 1) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        const traceimage = requestdata.traceImage[0]
        const answerimage = read(readConfig(configfilepath, 'dataRootPath') + '/exam/' + marklogres.examId + '/' + marklogres.subject + '/answer/' + marklogres.studentAccount + '/' + markgroup.name)
        if (!answerimage && traceimage) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的traceImage参数'
          }
        }
        if (answerimage) {
          const answerinfo = await getImageInfo(answerimage)
          if (!answerinfo && traceimage) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的traceImage参数'
            }
          }
          if (answerinfo && !traceimage) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的traceImage参数'
            }
          }
          const traceinfo = await getImageInfo(traceimage)
          if (!traceinfo || traceinfo.height != answerinfo.height || traceinfo.width != answerinfo.width) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的traceImage参数'
            }
          }
        }
      }
      if (type == 'newarbitrate') {
        await db.collection('marklog').insertOne({
          marklogId: marklogres.marklogId,
          examId: marklogres.examId,
          subject: marklogres.subject,
          studentAccount: marklogres.studentAccount,
          questionName: marklogres.questionName,
          markerAccount: account.account,
          excellent: requestdata.excellent,
          typicalMistake: requestdata.typicalMistake,
          doubtful: requestdata.doubtful,
          type: 'arbitrate',
          stepScore: requestdata.stepScore,
          totalScore: sum(requestdata.stepScore),
          createTime: Date.now()
        })
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'system'
        }, {
          $set: {
            arbitrateMarkerAccount: account.account,
            arbitrateMarkStepScore: requestdata.stepScore,
            finalStepScore: finalstepscore,
            finalTotalScore: sum(finalstepscore),
            minScoreDiff: minscorediff
          }
        })
      }
      if (type == 'updatefirst') {
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          markerAccount: account.account,
          type: 'first'
        }, {
          $set: {
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore)
          }
        })
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'system'
        }, {
          $set: {
            firstMarkStepScore: requestdata.stepScore,
            finalStepScore: finalstepscore,
            finalTotalScore: sum(finalstepscore),
            minScoreDiff: minscorediff
          }
        })
      }
      if (type == 'updatesecond') {
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          markerAccount: account.account,
          type: 'second'
        }, {
          $set: {
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore)
          }
        })
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'system'
        }, {
          $set: {
            secondMarkStepScore: requestdata.stepScore,
            finalStepScore: finalstepscore,
            finalTotalScore: sum(finalstepscore),
            minScoreDiff: minscorediff
          }
        })
      }
      if (type == 'updatethird') {
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          markerAccount: account.account,
          type: 'third'
        }, {
          $set: {
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore)
          }
        })
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'system'
        }, {
          $set: {
            thirdMarkStepScore: requestdata.stepScore,
            finalStepScore: finalstepscore,
            finalTotalScore: sum(finalstepscore),
            minScoreDiff: minscorediff
          }
        })
      }
      if (type == 'updatearbitrate') {
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          markerAccount: account.account,
          type: 'arbitrate'
        }, {
          $set: {
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore)
          }
        })
        await db.collection('marklog').updateOne({
          marklogId: marklogres.marklogId,
          type: 'system'
        }, {
          $set: {
            arbitrateMarkStepScore: requestdata.stepScore,
            finalStepScore: finalstepscore,
            finalTotalScore: sum(finalstepscore),
            minScoreDiff: minscorediff
          }
        })
      }
      if (['newfirst', 'newsecond', 'newthird'].includes(type)) {
        let quota = Infinity
        if (!member.allowExceedQuota) {
          const count = await db.collection('marklog').countDocuments({
            examId: marklogres.examId,
            subject: marklogres.subject,
            questionName: marklogres.questionName,
            markerAccount: account.account,
            type: {
              $in: ['first', 'second', 'third']
            }
          })
          const yu = member.quota - count
          quota = yu > 0 ? yu : 0
        }
        if (quota == 0) {
          return {
            errCode: 400,
            errMsg: '任务量已完成',
            errFix: '无修复建议'
          }
        }
        if (type == 'newfirst') {
          await db.collection('marklog').insertOne({
            marklogId: marklogres.marklogId,
            examId: marklogres.examId,
            subject: marklogres.subject,
            studentAccount: marklogres.studentAccount,
            questionName: marklogres.questionName,
            markerAccount: account.account,
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            type: 'first',
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore),
            consistencyChecked: false,
            createTime: Date.now()
          })
          await db.collection('marklog').updateOne({
            marklogId: marklogres.marklogId,
            type: 'system'
          }, {
            $set: {
              firstMarkerAccount: account.account,
              firstMarkStepScore: requestdata.stepScore,
              finalStepScore: finalstepscore,
              finalTotalScore: sum(finalstepscore),
              minScoreDiff: minscorediff
            }
          })
        }
        if (type == 'newthird') {
          await db.collection('marklog').insertOne({
            marklogId: marklogres.marklogId,
            examId: marklogres.examId,
            subject: marklogres.subject,
            studentAccount: marklogres.studentAccount,
            questionName: marklogres.questionName,
            markerAccount: account.account,
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            type: 'third',
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore),
            consistencyChecked: false,
            createTime: Date.now()
          })
          await db.collection('marklog').updateOne({
            marklogId: marklogres.marklogId,
            type: 'system'
          }, {
            $set: {
              thirdMarkerAccount: account.account,
              thirdMarkStepScore: requestdata.stepScore,
              finalStepScore: finalstepscore,
              finalTotalScore: sum(finalstepscore),
              minScoreDiff: minscorediff
            }
          })
        }
        if (type == 'newsecond') {
          let secondyu = 1
          if (markgroup.secondMarkPercent != 1) {
            const allcount = await db.collection('marklog').countDocuments({
              examId: marklogres.examId,
              subject: marklogres.subject,
              questionName: marklogres.questionName,
              questionReason: ''
            })
            const finishcount = await db.collection('marklog').countDocuments({
              examId: marklogres.examId,
              subject: marklogres.subject,
              questionName: marklogres.questionName,
              secondMarkerAccount: {
                $ne: ''
              },
              questionReason: ''
            })
            const cha = Math.round(allcount * markgroup.secondMarkPercent) - finishcount
            secondyu = cha < 0 ? 0 : cha
          }
          if (secondyu == 0) {
            return {
              errCode: 400,
              errMsg: '双评比例已完成',
              errFix: '无修复建议'
            }
          }
          await db.collection('marklog').insertOne({
            marklogId: marklogres.marklogId,
            examId: marklogres.examId,
            subject: marklogres.subject,
            studentAccount: marklogres.studentAccount,
            questionName: marklogres.questionName,
            markerAccount: account.account,
            excellent: requestdata.excellent,
            typicalMistake: requestdata.typicalMistake,
            doubtful: requestdata.doubtful,
            type: 'second',
            stepScore: requestdata.stepScore,
            totalScore: sum(requestdata.stepScore),
            consistencyChecked: false,
            createTime: Date.now()
          })
          await db.collection('marklog').updateOne({
            marklogId: marklogres.marklogId,
            type: 'system'
          }, {
            $set: {
              secondMarkerAccount: account.account,
              secondMarkStepScore: requestdata.stepScore,
              finalStepScore: finalstepscore,
              finalTotalScore: sum(finalstepscore),
              minScoreDiff: minscorediff
            }
          })
        }
      }
      const dir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + marklogres.examId + '/' + marklogres.subject + '/marktraceimage/' + marklogres.studentAccount + '/' + marklogres.questionName + '-' + marktype + '-'
      for (let i = 0; i < requestdata.traceImage.length; i++) {
        const item = requestdata.traceImage[i]
        write(dir + i, item)
      }
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (requestdata.consistencyCheck) {
      const data = await db.collection('marklog').findOne({
        marklogId: requestdata.id,
        markerAccount: account.account,
        type: {
          $in: ['first', 'second', 'third']
        }
      })
      if (!data) {
        return {
          errCode: 400,
          errMsg: '阅卷记录不存在',
          errFix: '无修复建议'
        }
      }
      if (data.consistencyChecked) {
        return {
          errCode: 400,
          errMsg: '已一致性检测',
          errFix: '无修复建议'
        }
      }
      const count = await db.collection('marklog').countDocuments({
        examId: marklogres.examId,
        subject: marklogres.subject,
        questionName: marklogres.questionName,
        markerAccount: account.account,
        type: {
          $in: ['first', 'second', 'third']
        }
      })
      let yu = Math.round(count * markgroup.consistencyCheckPercent)
      const check = await db.collection('marklog').findOne({
        examId: marklogres.examId,
        subject: marklogres.subject,
        questionName: marklogres.questionName,
        markerAccount: account.account,
        type: 'consistencycheck'
      })
      if (check) {
        yu = yu - check.marklogId.length
      }
      if (yu <= 0) {
        return {
          errCode: 400,
          errMsg: '一致性检测已达比例',
          errFix: '无修复建议'
        }
      }
      await db.collection('marklog').updateOne({
        marklogId: requestdata.id,
        markerAccount: account.account,
        type: {
          $in: ['first', 'second', 'third']
        }
      }, {
        $set: {
          consistencyChecked: true
        }
      })
      if (!check) {
        await db.collection('marklog').insertOne({
          examId: marklogres.examId,
          subject: marklogres.subject,
          questionName: marklogres.questionName,
          markerAccount: account.account,
          type: 'consistencycheck',
          marklogId: [requestdata.id],
          scoreDiff: [Math.abs(data.totalScore - sum(requestdata.stepScore))]
        })
      }
      if (check) {
        await db.collection('marklog').updateOne({
          examId: marklogres.examId,
          subject: marklogres.subject,
          questionName: marklogres.questionName,
          markerAccount: account.account,
          type: 'consistencycheck'
        }, {
          $set: {
            marklogId: check.marklogId.concat([requestdata.id]),
            scoreDiff: check.scoreDiff.concat([Math.abs(data.totalScore - sum(requestdata.stepScore))])
          }
        })
      }
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
  }
}