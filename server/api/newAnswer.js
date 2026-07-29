'use strict'
exports.main = async (event, configfilepath) => {
  const crypto = require('crypto')
  const { write } = require('../../util/file')
  const { getAnswerIndex } = require('../util/ismarked')
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
  if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subject参数'
    }
  }
  if (!requestdata.answer) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递answer参数'
    }
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    const data = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject
    })
    if (!data) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    if (data.markStatus == 'end') {
      return {
        errCode: 400,
        errMsg: '阅卷已结束',
        errFix: '无修复建议'
      }
    }
    if (!data.answerOnline) {
      if (typeof (requestdata.studentAccount) != 'string' || requestdata.studentAccount.length != 36) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的studentAccount参数'
        }
      }
      if (typeof (requestdata.answer.volume) != 'string' || !requestdata.answer.volume || !Array.isArray(requestdata.answer.page) || !Array.isArray(requestdata.answer.optionalQuestion)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的answer参数'
        }
      }
      const volume = data.volume.find(item => item.name == requestdata.answer.volume)
      if (!volume || volume.page.length != requestdata.answer.page.length || volume.optionalQuestion.length != requestdata.answer.optionalQuestion.length) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的answer参数'
        }
      }
      const result = {
        volume: requestdata.answer.volume,
        page: volume.page.map(item => {
          return {
            image: '',
            originCoord: []
          }
        }),
        optionalQuestion: Array.from({
          length: volume.optionalQuestion.length
        }, () => [])
      }
      for (let i = 0; i < result.page.length; i++) {
        const page = requestdata.answer.page[i]
        if (typeof (page.image) != 'string' || !/^data:image\/\w+;base64,/.test(page.image)) {
          return {
            errCode: 400,
            errMsg: '第' + i + '页图片不合法',
            errFix: '无修复建议'
          }
        }
        const coordvalid = require('../util/checksubjectconfig').isXyValid(page.originCoord)
        if (!coordvalid) {
          return {
            errCode: 400,
            errMsg: '第' + i + '页定位点坐标不合法',
            errFix: '无修复建议'
          }
        }
        result.page[i] = {
          image: page.image,
          originCoord: page.originCoord
        }
      }
      for (let i = 0; i < result.optionalQuestion.length; i++) {
        const question = volume.optionalQuestion[i]
        const exist = requestdata.answer.optionalQuestion[i]
        if (!Array.isArray(exist) || !exist.every(item => question.name.includes(item))) {
          return {
            errCode: 400,
            errMsg: '选做题组' + i + '不合法',
            errFix: '无修复建议'
          }
        }
        const name = [...new Set(exist)]
        if (name.length > question.selectCount) {
          return {
            errCode: 400,
            errMsg: '选做题组' + i + '不合法',
            errFix: '无修复建议'
          }
        }
        result.optionalQuestion[i] = name
      }
      if (account.type == 'student') {
        return {
          errCode: 403,
          errMsg: '无权限',
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
      if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
        const adminexist = data.admin.find(item => item.account == account.account)
        if (!adminexist) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (adminexist && !adminexist.permission.includes('manageAnswer')) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
      }
      const answer = await db.collection('answer').findOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: requestdata.studentAccount
      })
      if (answer) {
        return {
          errCode: 400,
          errMsg: '作答已提交',
          errFix: '无修复建议'
        }
      }
      let studentexist = false
      if (!examgetres.schoolId) {
        studentexist = await db.collection('account').findOne({
          account: requestdata.studentAccount,
          type: 'student'
        })
      }
      if (examgetres.schoolId) {
        studentexist = await db.collection('account').findOne({
          account: requestdata.studentAccount,
          type: 'student',
          schoolId: examgetres.schoolId
        })
      }
      if (!studentexist) {
        return {
          errCode: 400,
          errMsg: '学生不存在',
          errFix: '无修复建议'
        }
      }
      const dir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + requestdata.studentAccount + '/'
      result.page.forEach((item, index) => {
        write(dir + index, item.image)
      })
      await db.collection('answer').insertOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: requestdata.studentAccount,
        answer: {
          volume: result.volume,
          pageOriginCoord: result.page.map(item => item.originCoord)
        },
        createTime: Date.now()
      })
      const allobjectivequestionname = []
      let allsubjectivequestionname = []
      volume.page.forEach(item => {
        item.forEach(i => {
          if (i.objectiveQuestionName) {
            allobjectivequestionname.push(i.objectiveQuestionName)
          }
          if (i.markGroupName) {
            allsubjectivequestionname = allsubjectivequestionname.concat(data.markGroup.find(m => m.name == i.markGroupName).questionName)
          }
        })
      })
      allsubjectivequestionname = [...new Set(allsubjectivequestionname)]
      const allquestionname = allobjectivequestionname.concat(allsubjectivequestionname)
      const alloptionalquestionname = volume.optionalQuestion.map(item => item.name).flat()
      const selectquestionname = result.optionalQuestion.flat()
      const finalquestionname = allquestionname.filter(item => !alloptionalquestionname.includes(item)).concat(selectquestionname)
      const selectobjectivequestionname = finalquestionname.filter(item => allobjectivequestionname.includes(item))
      const selectobjectivedocuments = selectobjectivequestionname.map(item => {
        return {
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: requestdata.studentAccount,
          questionName: item,
          type: 'system',
          answer: [],
          finished: false
        }
      })
      const selectsubjectivedocuments = finalquestionname.filter(item => allsubjectivequestionname.includes(item)).map(item => {
        return {
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: requestdata.studentAccount,
          questionName: item,
          type: 'system',
          marklogId: crypto.randomUUID(),
          firstMarkerAccount: '',
          secondMarkerAccount: '',
          thirdMarkerAccount: '',
          arbitrateMarkerAccount: '',
          questionMarkerAccount: '',
          updateMarkerAccount: '',
          firstMarkStepScore: [],
          secondMarkStepScore: [],
          thirdMarkStepScore: [],
          arbitrateMarkStepScore: [],
          questionMarkStepScore: [],
          updateMarkStepScore: [],
          questionReason: '',
          questionNewAccount: '',
          minScoreDiff: 0,
          finalStepScore: [],
          finalTotalScore: 0
        }
      })
      const alldocuments = selectobjectivedocuments.concat(selectsubjectivedocuments)
      if (alldocuments.length > 0) {
        await db.collection('marklog').insertMany(alldocuments, {
          ordered: false
        })
      }
      async function sb(page, pages, configfilepath, questionnames) {
        const answerlist = await getAnswerIndex(page, pages, configfilepath, questionnames)
        const batch = answerlist.map(item => ({
          updateOne: {
            filter: {
              examId: requestdata.id,
              subject: requestdata.subject,
              studentAccount: requestdata.studentAccount,
              questionName: item.questionName
            },
            update: {
              $set: {
                answer: item.answer,
                finished: true
              }
            }
          }
        }))
        await db.collection('marklog').bulkWrite(batch, {
          ordered: false
        })
      }
      if (selectobjectivequestionname.length > 0) {
        sb(volume.page, result.page, configfilepath, selectobjectivequestionname)
      }
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
    if (data.answerOnline) {
      if (!Array.isArray(requestdata.answer.objectiveQuestion) || !Array.isArray(requestdata.answer.subjectiveQuestionGroup) || !Array.isArray(requestdata.answer.optionalQuestion)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的answer参数'
        }
      }
      const result = {
        objectiveQuestion: data.objectiveQuestion.map(item => {
          return {
            name: item.name,
            answer: []
          }
        }),
        subjectiveQuestionGroup: data.markGroup.map(item => {
          return {
            name: item.name,
            answer: ''
          }
        }),
        optionalQuestion: Array.from({
          length: data.volume[0].optionalQuestion.length
        }, () => [])
      }
      for (let i = 0; i < result.objectiveQuestion.length; i++) {
        const question = data.objectiveQuestion[i]
        const exist = requestdata.answer.objectiveQuestion.find(item => item.name == question.name)
        if (!exist) {
          return {
            errCode: 400,
            errMsg: '客观题' + question.name + '作答不存在',
            errFix: '无修复建议'
          }
        }
        if (!Array.isArray(exist.answer) || !exist.answer.every(item => question.option[item])) {
          return {
            errCode: 400,
            errMsg: '客观题' + question.name + '作答不合法',
            errFix: '无修复建议'
          }
        }
        result.objectiveQuestion[i].answer = [...new Set(exist.answer)].sort((a, b) => a - b)
      }
      for (let i = 0; i < result.subjectiveQuestionGroup.length; i++) {
        const question = data.markGroup[i]
        const exist = requestdata.answer.subjectiveQuestionGroup.find(item => item.name == question.name)
        if (!exist) {
          return {
            errCode: 400,
            errMsg: '主观题组' + question.name + '作答不存在',
            errFix: '无修复建议'
          }
        }
        if (typeof (exist.answer) != 'string' || exist.answer.length > 100000 || (exist.answer && !/^data:image\/\w+;base64,/.test(exist.answer))) {
          return {
            errCode: 400,
            errMsg: '主观题组' + question.name + '作答不合法',
            errFix: '无修复建议（图片大小不超过75KB）'
          }
        }
        result.subjectiveQuestionGroup[i].answer = exist.answer
      }
      for (let i = 0; i < result.optionalQuestion.length; i++) {
        const question = data.volume[0].optionalQuestion[i]
        const exist = requestdata.answer.optionalQuestion[i]
        if (!exist) {
          return {
            errCode: 400,
            errMsg: '选做题组' + i + '不存在',
            errFix: '无修复建议'
          }
        }
        if (!Array.isArray(exist) || !exist.every(item => question.name.includes(item))) {
          return {
            errCode: 400,
            errMsg: '选做题组' + i + '不合法',
            errFix: '无修复建议'
          }
        }
        const name = [...new Set(exist)]
        if (name.length > question.selectCount) {
          return {
            errCode: 400,
            errMsg: '选做题组' + i + '不合法',
            errFix: '无修复建议'
          }
        }
        result.optionalQuestion[i] = name
      }
      if (account.type != 'student') {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (data.endTime < Date.now()) {
        return {
          errCode: 400,
          errMsg: '作答已结束',
          errFix: '无修复建议'
        }
      }
      const answer = await db.collection('answer').findOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: account.account
      })
      if (answer) {
        return {
          errCode: 400,
          errMsg: '作答已提交',
          errFix: '无修复建议'
        }
      }
      const classids = await db.collection('class').distinct('classId', {
        student: account.account
      })
      if (!classids.some(item => data.class.includes(item))) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      const dir = readConfig(configfilepath, 'dataRootPath') + '/exam/' + requestdata.id + '/' + requestdata.subject + '/answer/' + account.account + '/'
      result.subjectiveQuestionGroup.forEach(item => {
        write(dir + item.name, item.answer)
      })
      await db.collection('answer').insertOne({
        examId: requestdata.id,
        subject: requestdata.subject,
        studentAccount: account.account,
        createTime: Date.now()
      })
      const allobjectivequestionname = data.objectiveQuestion.map(item => item.name)
      const allsubjectivequestionname = data.subjectiveQuestion.map(item => item.name)
      const allquestionname = allobjectivequestionname.concat(allsubjectivequestionname)
      const alloptionalquestionname = data.volume[0].optionalQuestion.map(item => item.name).flat()
      const selectquestionname = result.optionalQuestion.flat()
      const finalquestionname = allquestionname.filter(item => !alloptionalquestionname.includes(item)).concat(selectquestionname)
      const selectobjectivedocuments = finalquestionname.filter(item => allobjectivequestionname.includes(item)).map(item => {
        const answer = result.objectiveQuestion.find(q => q.name == item)
        return {
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: account.account,
          questionName: item,
          type: 'system',
          answer: answer.answer,
          finished: true
        }
      })
      const selectsubjectivedocuments = finalquestionname.filter(item => allsubjectivequestionname.includes(item)).map(item => {
        return {
          examId: requestdata.id,
          subject: requestdata.subject,
          studentAccount: account.account,
          questionName: item,
          type: 'system',
          marklogId: crypto.randomUUID(),
          firstMarkerAccount: '',
          secondMarkerAccount: '',
          thirdMarkerAccount: '',
          arbitrateMarkerAccount: '',
          questionMarkerAccount: '',
          updateMarkerAccount: '',
          firstMarkStepScore: [],
          secondMarkStepScore: [],
          thirdMarkStepScore: [],
          arbitrateMarkStepScore: [],
          questionMarkStepScore: [],
          updateMarkStepScore: [],
          questionReason: '',
          questionNewAccount: '',
          minScoreDiff: 0,
          finalStepScore: [],
          finalTotalScore: 0
        }
      })
      const alldocuments = selectobjectivedocuments.concat(selectsubjectivedocuments)
      if (alldocuments.length > 0) {
        await db.collection('marklog').insertMany(alldocuments, {
          ordered: false
        })
      }
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
  }
}