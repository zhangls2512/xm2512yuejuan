'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { calcObjectiveScore, sum } = require('../util/scorereport')
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
    if (account.type != 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: requestdata.id,
      status: 'finished',
      subject: {
        $ne: '多学科'
      },
      student: account.account,
      studentVisible: true
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告配置不存在',
        errFix: '无修复建议'
      }
    }
    const examsubjectgetres = await db.collection('examsubject').findOne({
      examId: scorereportconfigres.examId,
      $or: [
        {
          name: scorereportconfigres.subject
        },
        {
          subSubject: scorereportconfigres.subject
        }
      ]
    })
    if (!examsubjectgetres) {
      return {
        errCode: 400,
        errMsg: '科目不存在',
        errFix: '无修复建议'
      }
    }
    const marklogres = await db.collection('marklog').find({
      examId: scorereportconfigres.examId,
      subject: examsubjectgetres.name,
      studentAccount: account.account,
      questionName: {
        $in: scorereportconfigres.config.scoringQuestionNames
      },
      type: 'system'
    }).toArray()
    const questions = examsubjectgetres.objectiveQuestion.concat(examsubjectgetres.subjectiveQuestion)
    const result = []
    marklogres.forEach(item => {
      const question = questions.find(i => i.name == item.questionName)
      if (question.correctOptionIndex) {
        result.push({
          questionName: item.questionName,
          answer: item.answer.map(i => question.option[i]).join(''),
          correctAnswer: question.correctOptionIndex.length > 0 ? question.correctOptionIndex.map(i => question.option[i]).join('') : '无',
          score: calcObjectiveScore(question, item.answer),
          totalScore: Math.max(...[...new Set(question.correctOptionCountRule.map(item => item.score).concat(question.specialOptionGroupRule.map(item => item.score)))])
        })
      } else {
        result.push({
          questionName: item.questionName,
          answer: '',
          correctAnswer: '',
          score: item.finalTotalScore,
          totalScore: sum(question.stepScore.map(i => i[0]))
        })
      }
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}