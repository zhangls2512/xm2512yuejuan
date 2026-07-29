'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const { checkArrNotHaveSameItem } = require('../util/checksubjectconfig')
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.id) != 'string' || requestdata.id.length != 36) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的id参数'
    }
  }
  if (typeof (requestdata.name) != 'string' || !requestdata.name) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  if (typeof (requestdata.classTeacherVisible) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的classTeacherVisible参数'
    }
  }
  if (!Array.isArray(requestdata.jointVisibleAccount) || !requestdata.jointVisibleAccount.every(item => typeof (item) == 'string' && item.length == 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的jointVisibleAccount参数'
    }
  }
  if (!Array.isArray(requestdata.schoolVisibleAccount) || !requestdata.schoolVisibleAccount.every(item => typeof (item) == 'string' && item.length == 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的schoolVisibleAccount参数'
    }
  }
  if (!Array.isArray(requestdata.classVisibleAccount) || !requestdata.classVisibleAccount.every(item => typeof (item) == 'string' && item.length == 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的classVisibleAccount参数'
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
    const scorereportconfigres = await db.collection('scorereportconfig').findOne({
      scorereportconfigId: requestdata.id
    })
    if (!scorereportconfigres) {
      return {
        errCode: 400,
        errMsg: '成绩报告不存在',
        errFix: '无修复建议'
      }
    }
    if (scorereportconfigres.status == 'processing') {
      return {
        errCode: 400,
        errMsg: '成绩报告生成中',
        errFix: '无修复建议'
      }
    }
    const examgetres = await db.collection('exam').findOne({
      examId: scorereportconfigres.examId
    })
    let validaccounts = []
    if (!examgetres.schoolId) {
      validaccounts = await db.collection('account').find({
        type: 'teacher'
      }, {
        projection: {
          _id: false,
          account: true
        }
      }).toArray()
    }
    if (examgetres.schoolId) {
      validaccounts = await db.collection('account').find({
        schoolId: examgetres.schoolId,
        type: 'teacher'
      }, {
        projection: {
          _id: false,
          account: true
        }
      }).toArray()
    }
    validaccounts = validaccounts.map(item => item.account)
    if (requestdata.jointVisibleAccount.some(item => !validaccounts.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的jointVisibleAccount参数'
      }
    }
    if (requestdata.schoolVisibleAccount.some(item => !validaccounts.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的schoolVisibleAccount参数'
      }
    }
    if (requestdata.classVisibleAccount.some(item => !validaccounts.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的classVisibleAccount参数'
      }
    }
    if (scorereportconfigres.subject == '多学科') {
      const admin = examgetres.admin.find(item => item.account == account.account)
      if (!admin && (account.type != 'admin' || account.schoolId != examgetres.schoolId)) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (admin && !admin.permission.includes('manageScorereportconfig')) {
        return {
          errCode: 403,
          errMsg: '无权限',
          errFix: '无修复建议'
        }
      }
      if (!Array.isArray(requestdata.scorereportconfigIdArray) || requestdata.scorereportconfigIdArray.length == 0 || !requestdata.scorereportconfigIdArray.every(item => typeof (item) == 'string' && item.length == 36)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的scorereportconfigIdArray参数'
        }
      }
      const subjects = []
      for (let i = 0; i < requestdata.scorereportconfigIdArray.length; i++) {
        const item = requestdata.scorereportconfigIdArray[i]
        const scoreconfig = await db.collection('scorereportconfig').findOne({
          scorereportconfigId: item,
          examId: examgetres.examId,
          subject: {
            $ne: '多学科'
          },
          status: 'finished'
        })
        if (!scoreconfig) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的scorereportconfigIdArray参数'
          }
        }
        if (subjects.includes(scoreconfig.subject)) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的scorereportconfigIdArray参数'
          }
        }
        subjects.push(scoreconfig.subject)
      }
      if (subjects.length < 2) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的scorereportconfigIdArray参数'
        }
      }
      await db.collection('scorereportconfig').updateOne({
        scorereportconfigId: requestdata.id
      }, {
        $set: {
          name: requestdata.name,
          scorereportconfigIdArray: requestdata.scorereportconfigIdArray,
          classTeacherVisible: requestdata.classTeacherVisible,
          jointVisibleAccount: requestdata.jointVisibleAccount,
          schoolVisibleAccount: requestdata.schoolVisibleAccount,
          classVisibleAccount: requestdata.classVisibleAccount
        }
      })
    }
    if (scorereportconfigres.subject != '多学科') {
      const config = {
        fuScoreRule: []
      }
      if (!requestdata.config) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
        }
      }
      if (typeof (requestdata.config.scoreTimes) != 'number' || requestdata.config.scoreTimes <= 0) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
        }
      }
      config.scoreTimes = requestdata.config.scoreTimes
      if (!Array.isArray(requestdata.config.scoringQuestionNames) || requestdata.config.scoringQuestionNames.length == 0 || !requestdata.config.scoringQuestionNames.every(item => typeof (item) == 'string' && item)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
        }
      }
      config.scoringQuestionNames = [...new Set(requestdata.config.scoringQuestionNames)]
      if (!Array.isArray(requestdata.config.fuScoreRule)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
        }
      }
      for (let i = 0; i < requestdata.config.fuScoreRule.length; i++) {
        const ruleitem = requestdata.config.fuScoreRule[i]
        if (typeof (ruleitem.level) != 'string' || !ruleitem.level || config.fuScoreRule.find(f => f.level == ruleitem.level)) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (typeof (ruleitem.ratio) != 'number' || ruleitem.ratio <= 0 || ruleitem.ratio > 1) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (i > 0 && ruleitem.ratio < requestdata.config.fuScoreRule[i - 1].ratio) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (i == requestdata.config.fuScoreRule.length - 1 && ruleitem.ratio != 1) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (!Number.isInteger(ruleitem.max) || ruleitem.max <= 0) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (!Number.isInteger(ruleitem.min) || ruleitem.min < 0) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (ruleitem.max <= ruleitem.min) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        if (i > 0 && ruleitem.max != requestdata.config.fuScoreRule[i - 1].min - 1) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的config参数'
          }
        }
        config.fuScoreRule.push({
          level: ruleitem.level,
          ratio: ruleitem.ratio,
          max: ruleitem.max,
          min: ruleitem.min
        })
      }
      if (!checkArrNotHaveSameItem(config.fuScoreRule.map(item => item.level))) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
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
      let validquestionnames = []
      if (scorereportconfigres.subject == examsubjectgetres.name) {
        validquestionnames = examsubjectgetres.objectiveQuestion.map(item => item.name).concat(examsubjectgetres.subjectiveQuestion.map(item => item.name))
      }
      if (examsubjectgetres.subSubject.includes(scorereportconfigres.subject)) {
        validquestionnames = examsubjectgetres.objectiveQuestion.filter(item => item.subject == scorereportconfigres.subject).map(item => item.name).concat(examsubjectgetres.subjectiveQuestion.filter(item => item.subject == scorereportconfigres.subject).map(item => item.name))
      }
      if (config.scoringQuestionNames.some(item => !validquestionnames.includes(item))) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的config参数'
        }
      }
      if (!(account.type == 'admin' && account.schoolId == examgetres.schoolId)) {
        const adminexist = examsubjectgetres.admin.find(item => item.account == account.account)
        if (!adminexist) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (adminexist && !adminexist.permission.includes('manageScorereportconfig')) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
      }
      await db.collection('scorereportconfig').updateOne({
        scorereportconfigId: requestdata.id
      }, {
        $set: {
          name: requestdata.name,
          config: config,
          classTeacherVisible: requestdata.classTeacherVisible,
          jointVisibleAccount: requestdata.jointVisibleAccount,
          schoolVisibleAccount: requestdata.schoolVisibleAccount,
          classVisibleAccount: requestdata.classVisibleAccount
        }
      })
    }
    return {
      errCode: 0,
      errMsg: '成功'
    }
  }
}