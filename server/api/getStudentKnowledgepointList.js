'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { calcObjectiveScore, fixtwo, sum } = require('../util/scorereport')
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
    const exam = await db.collection('exam').findOne({
      examId: scorereportconfigres.examId
    })
    const marklogres = await db.collection('marklog').find({
      examId: scorereportconfigres.examId,
      subject: examsubjectgetres.name,
      studentAccount: account.account,
      questionName: {
        $in: scorereportconfigres.config.scoringQuestionNames
      },
      type: 'system'
    }).toArray()
    const questions = examsubjectgetres.objectiveQuestion.concat(examsubjectgetres.subjectiveQuestion).filter(item => item.questionId)
    const knowledgepointmap = {}
    const promises = marklogres.map(async (item) => {
      const question = questions.find(q => q.name == item.questionName)
      if (question) {
        const qa = await db.collection('question').findOne({
          questionId: question.questionId,
          schoolId: exam.schoolId
        })
        if (qa) {
          qa.knowledgepoint.forEach(k => {
            if (!knowledgepointmap[k]) {
              knowledgepointmap[k] = {
                name: k,
                questionName: [],
                score: 0,
                fullscore: 0
              }
            }
            knowledgepointmap[k].questionName.push(item.questionName)
            knowledgepointmap[k].score += item.answer ? calcObjectiveScore(question, item.answer) : item.finalTotalScore
            knowledgepointmap[k].fullscore += item.answer ? Math.max(...[...new Set(question.correctOptionCountRule.map(r => r.score).concat(question.specialOptionGroupRule.map(r => r.score)))]) : sum(question.stepScore.map(s => s[0]))
          })
        }
      }
    })
    await Promise.all(promises)
    return {
      errCode: 0,
      errMsg: '成功',
      data: Object.values(knowledgepointmap).map(item => {
        return {
          name: item.name,
          questionName: item.questionName,
          scoringRate: fixtwo((item.score / item.fullscore) * 100)
        }
      })
    }
  }
}