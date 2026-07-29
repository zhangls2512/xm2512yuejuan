'use strict'
exports.main = async (event, configfilepath) => {
  const { read } = require('../../util/file')
  const { readConfig } = require('../../util/readconfig')
  const db = await (require('../util/db').database(configfilepath))
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
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
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type != 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const classids = await db.collection('class').distinct('classId', {
      student: account.account
    })
    const data = await db.collection('examsubject').findOne({
      examId: requestdata.id,
      name: requestdata.subject,
      answerOnline: true,
      endTime: {
        $gte: Date.now()
      },
      class: {
        $in: classids
      }
    })
    if (!data) {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
    if (data.startTime > Date.now()) {
      return {
        errCode: 400,
        errMsg: '作答未开始',
        errFix: '无修复建议'
      }
    }
    const exam = await db.collection('exam').findOne({
      examId: requestdata.id
    }, {
      projection: {
        _id: false,
        schoolId: true
      }
    })
    if (!exam.schoolId || (exam.schoolId && account.schoolId)) {
      const result = {
        objectiveQuestion: [],
        subjectiveQuestionGroup: [],
        optionalQuestion: data.volume[0].optionalQuestion
      }
      data.objectiveQuestion.forEach(item => {
        result.objectiveQuestion.push({
          name: item.name,
          option: item.option,
          extra: item.extra,
          question: item.questionId
        })
      })
      data.markGroup.forEach(item => {
        const list = []
        item.questionName.forEach(q => {
          const question = data.subjectiveQuestion.find(item => item.name == q)
          list.push({
            name: question.name,
            extra: question.extra,
            question: question.questionId
          })
        })
        result.subjectiveQuestionGroup.push({
          name: item.name,
          question: list
        })
      })
      const dir = readConfig(configfilepath, 'dataRootPath') + '/question/'
      const allquestion = data.objectiveQuestion.concat(data.subjectiveQuestion)
      const questionmap = {}
      allquestion.forEach(item => {
        questionmap[item.name] = item.questionId
      })
      const questions = await db.collection('question').find({
        questionId: {
          $in: [...new Set(allquestion.map(item => item.questionId).filter(item => item))]
        },
        schoolId: exam.schoolId
      }, {
        projection: {
          _id: true,
          questionId: true
        }
      }).toArray()
      const questionset = new Set(questions.map(item => item.questionId))
      result.objectiveQuestion.forEach(item => {
        if (questionset.has(questionmap[item.name])) {
          item.question = read(dir + questionmap[item.name] + '-question')
        }
      })
      result.subjectiveQuestionGroup.forEach(g => {
        g.question.forEach(item => {
          if (questionset.has(questionmap[item.name])) {
            item.question = read(dir + questionmap[item.name] + '-question')
          }
        })
      })
      return {
        errCode: 0,
        errMsg: '成功',
        data: result
      }
    } else {
      return {
        errCode: 400,
        errMsg: '考试不存在',
        errFix: '无修复建议'
      }
    }
  }
}