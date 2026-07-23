function checkSubjectConfig(requestdata, olddata) {
  const result = olddata ? olddata : {}
  if (!Array.isArray(requestdata.class) || !requestdata.class.every(item => typeof (item) == 'string' && item.length == 36)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的class参数'
    }
  }
  result.class = [...new Set(requestdata.class)]
  if (!olddata) {
    if (typeof (requestdata.answerOnline) != 'boolean') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的answerOnline参数'
      }
    }
    result.answerOnline = requestdata.answerOnline
  }
  if (result.answerOnline && !olddata) {
    if (!Number.isInteger(requestdata.startTime) || requestdata.startTime < 0) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的startTime参数'
      }
    }
    if (olddata && requestdata.startTime > olddata.startTime) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的startTime参数'
      }
    }
    if (!Number.isInteger(requestdata.endTime) || requestdata.endTime < requestdata.startTime) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的endTime参数'
      }
    }
    if (olddata && requestdata.endTime < olddata.endTime) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的endTime参数'
      }
    }
    result.startTime = requestdata.startTime
    result.endTime = requestdata.endTime
  }
  if (!Array.isArray(requestdata.admin)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的admin参数'
    }
  }
  const admin = []
  const adminaccount = []
  const validpermissions = ['dealQuestion', 'getMarkProgress', 'updateScore', 'manageAnswer', 'manageScorereportconfig', 'getAnswerCsv', 'updateConfig']
  for (let i = 0; i < requestdata.admin.length; i++) {
    const item = requestdata.admin[i]
    if (typeof (item.account) != 'string' || item.account.length != 36 || !Array.isArray(item.permission) || !item.permission.every(p => validpermissions.includes(p))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的admin参数'
      }
    }
    if (!adminaccount.includes(item.account)) {
      admin.push({
        account: item.account,
        permission: [...new Set(item.permission)]
      })
      adminaccount.push(item.account)
    }
  }
  result.admin = admin
  result.adminAccount = adminaccount
  if (!Array.isArray(requestdata.objectiveQuestion)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的objectiveQuestion参数'
    }
  }
  for (let i = 0; i < requestdata.objectiveQuestion.length; i++) {
    const questionitem = requestdata.objectiveQuestion[i]
    if (typeof (questionitem.name) != 'string' || !questionitem.name || ['/', ','].some(ch => questionitem.name.includes(ch)) || questionitem.name.length > 255) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (typeof (questionitem.subject) != 'string' || questionitem.subject == '多学科') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (!Array.isArray(questionitem.option) || questionitem.option.length == 0 || !questionitem.option.every(item => typeof (item) == 'string' && item)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (typeof (questionitem.questionId) != 'string') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (questionitem.questionId && questionitem.questionId.length != 36) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (typeof (questionitem.extra) != 'boolean') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (!Array.isArray(questionitem.correctOptionIndex) || !questionitem.correctOptionIndex.every(item => questionitem.option[item])) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    questionitem.correctOptionIndex = [...new Set(questionitem.correctOptionIndex.sort((a, b) => a - b))]
    if (!Array.isArray(questionitem.correctOptionCountRule) || !questionitem.correctOptionCountRule.every(item => Number.isInteger(item.count) && item.count >= 0 && item.count <= questionitem.correctOptionIndex.length && item.score >= 0)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    if (!checkArrNotHaveSameItem(questionitem.correctOptionCountRule.map(item => item.count))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    questionitem.correctOptionCountRule = questionitem.correctOptionCountRule.map(item => {
      return {
        count: item.count,
        score: item.score
      }
    })
    if (!Array.isArray(questionitem.specialOptionGroupRule) || !questionitem.specialOptionGroupRule.every(item => item.optionIndex.every(optionIndex => questionitem.option[optionIndex]) && item.score >= 0)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    questionitem.specialOptionGroupRule = questionitem.specialOptionGroupRule.map(item => {
      return {
        optionIndex: [...new Set(item.optionIndex)].sort((a, b) => a - b),
        score: item.score
      }
    })
    if (!checkArrNotHaveSameItem(questionitem.specialOptionGroupRule.map(item => item.optionIndex.join(',')))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    requestdata.objectiveQuestion[i] = {
      name: questionitem.name,
      subject: questionitem.subject,
      option: questionitem.option,
      questionId: questionitem.questionId,
      extra: questionitem.extra,
      correctOptionIndex: questionitem.correctOptionIndex,
      correctOptionCountRule: questionitem.correctOptionCountRule,
      specialOptionGroupRule: questionitem.specialOptionGroupRule
    }
  }
  if (!checkArrNotHaveSameItem(requestdata.objectiveQuestion.map(item => item.name))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的objectiveQuestion参数'
    }
  }
  if (!olddata) {
    result.objectiveQuestion = requestdata.objectiveQuestion
  }
  if (olddata) {
    if (olddata.objectiveQuestion.length != requestdata.objectiveQuestion.length) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的objectiveQuestion参数'
      }
    }
    for (let i = 0; i < olddata.objectiveQuestion.length; i++) {
      const item = olddata.objectiveQuestion[i]
      const exist = requestdata.objectiveQuestion.find(ritem => ritem.name == item.name)
      if (!exist || exist.option.length != item.option.length) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的objectiveQuestion参数'
        }
      }
    }
    result.objectiveQuestion = requestdata.objectiveQuestion
  }
  if (!Array.isArray(requestdata.subjectiveQuestion)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subjectiveQuestion参数'
    }
  }
  for (let i = 0; i < requestdata.subjectiveQuestion.length; i++) {
    const questionitem = requestdata.subjectiveQuestion[i]
    if (typeof (questionitem.name) != 'string' || !questionitem.name || ['/', ','].some(ch => questionitem.name.includes(ch)) || questionitem.name.length > 255) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    if (typeof (questionitem.subject) != 'string' || questionitem.subject == '多学科') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    if (typeof (questionitem.questionId) != 'string') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    if (questionitem.questionId && questionitem.questionId.length != 36) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    if (typeof (questionitem.extra) != 'boolean') {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    if (!Array.isArray(questionitem.stepScore) || questionitem.stepScore.length == 0 || !questionitem.stepScore.every(item => item.every(score => typeof (score) == 'number' && score >= 0))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    questionitem.stepScore = questionitem.stepScore.map(item => [...new Set(item)].sort((a, b) => b - a))
    requestdata.subjectiveQuestion[i] = {
      name: questionitem.name,
      subject: questionitem.subject,
      questionId: questionitem.questionId,
      extra: questionitem.extra,
      stepScore: questionitem.stepScore
    }
    const totalscore = getTotalScoreFromQuestionName(requestdata, questionitem.name)
    if (typeof (questionitem.arbitrateScoreDiff) != 'number' || questionitem.arbitrateScoreDiff <= 0 || questionitem.arbitrateScoreDiff >= totalscore) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    requestdata.subjectiveQuestion[i].arbitrateScoreDiff = questionitem.arbitrateScoreDiff
  }
  if (!checkArrNotHaveSameItem(requestdata.subjectiveQuestion.map(item => item.name))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的subjectiveQuestion参数'
    }
  }
  if (!olddata) {
    result.subjectiveQuestion = requestdata.subjectiveQuestion
  }
  if (olddata) {
    if (olddata.subjectiveQuestion.length != requestdata.subjectiveQuestion.length) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的subjectiveQuestion参数'
      }
    }
    for (let i = 0; i < olddata.subjectiveQuestion.length; i++) {
      const item = olddata.subjectiveQuestion[i]
      const exist = requestdata.subjectiveQuestion.find(ritem => ritem.name == item.name)
      if (!exist) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的subjectiveQuestion参数'
        }
      }
      exist.stepScore = item.stepScore
    }
    result.subjectiveQuestion = requestdata.subjectiveQuestion
  }
  if (!checkArrNotHaveSameItem(requestdata.objectiveQuestion.map(item => item.name).concat(requestdata.subjectiveQuestion.map(item => item.name)))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '存在重复题号'
    }
  }
  if (result.objectiveQuestion.length + result.subjectiveQuestion.length == 0) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '无题目'
    }
  }
  result.subSubject = [...new Set(requestdata.objectiveQuestion.map(item => item.subject).concat(requestdata.subjectiveQuestion.map(item => item.subject)))]
  if (result.subSubject.length == 1) {
    result.subSubject = []
  }
  if (result.subSubject.length > 1) {
    for (let i = 0; i < result.subSubject.length; i++) {
      if (result.subSubject[i] == result.name) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '存在子科目与主科目相同'
        }
      }
      if (!result.subSubject[i]) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '存在未设置科目的题目'
        }
      }
    }
  }
  if (!Array.isArray(requestdata.markGroup)) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的markGroup参数'
    }
  }
  if (!checkArrNotHaveSameItem(requestdata.objectiveQuestion.map(item => item.name).concat(requestdata.subjectiveQuestion.map(item => item.name)))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '存在重复题号'
    }
  }
  const subjectivequestionnamearray = result.subjectiveQuestion.map(item => item.name)
  for (let i = 0; i < requestdata.markGroup.length; i++) {
    const questionitem = requestdata.markGroup[i]
    if (typeof (questionitem.name) != 'string' || !questionitem.name || (result.answerOnline && (questionitem.name.includes('/') || questionitem.name.length > 255))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (!Array.isArray(questionitem.questionName) || questionitem.questionName.length == 0 || !questionitem.questionName.every(item => subjectivequestionnamearray.includes(item))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    questionitem.questionName = [...new Set(questionitem.questionName)]
    const validpermissions = ['dealQuestion', 'getMarkProgress']
    const tempadmin = []
    const tempadminaccount = []
    for (let i = 0; i < questionitem.admin.length; i++) {
      const item = questionitem.admin[i]
      if (typeof (item.account) != 'string' || item.account.length != 36 || !Array.isArray(item.permission) || !item.permission.every(p => validpermissions.includes(p))) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的markGroup参数'
        }
      }
      if (!tempadminaccount.includes(item.account)) {
        tempadmin.push({
          account: item.account,
          permission: [...new Set(item.permission)]
        })
        tempadminaccount.push(item.account)
        if (!result.adminAccount.includes(item.account)) {
          result.adminAccount.push(item.account)
        }
      }
    }
    questionitem.admin = tempadmin
    const tempmember = []
    const tempmemberaccount = []
    for (let i = 0; i < questionitem.member.length; i++) {
      const item = questionitem.member[i]
      if (typeof (item.account) != 'string' || item.account.length != 36 || !Number.isInteger(item.quota) || item.quota <= 0 || typeof (item.allowExceedQuota) != 'boolean') {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的markGroup参数'
        }
      }
      if (!tempmemberaccount.includes(item.account)) {
        tempmember.push({
          account: item.account,
          quota: item.quota,
          allowExceedQuota: item.allowExceedQuota
        })
        tempmemberaccount.push(item.account)
        if (!result.adminAccount.includes(item.account)) {
          result.adminAccount.push(item.account)
        }
      }
    }
    if (typeof (questionitem.consistencyCheckPercent) != 'number' || questionitem.consistencyCheckPercent < 0 || questionitem.consistencyCheckPercent > 1) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (![1, 2, 3].includes(questionitem.time)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (tempmember.length < questionitem.time) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (typeof (questionitem.secondMarkPercent) != 'number' || questionitem.secondMarkPercent <= 0 || questionitem.secondMarkPercent > 1) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (!Array.isArray(questionitem.arbitrator) || !questionitem.arbitrator.every(item => typeof (item) == 'string' && item.length == 36)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    const arbitrator = [...new Set(questionitem.arbitrator)]
    const allmarker = [...new Set(tempmember.map(item => item.account).concat(arbitrator))]
    if (questionitem.time == 1 && allmarker.length == 0) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    if (questionitem.time > 1 && (questionitem.arbitrator.length == 0 || allmarker.length < questionitem.time + 1)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    requestdata.markGroup[i] = {
      name: questionitem.name,
      questionName: questionitem.questionName.sort((a, b) => a.localeCompare(b)),
      admin: questionitem.admin,
      member: tempmember,
      consistencyCheckPercent: questionitem.consistencyCheckPercent,
      time: questionitem.time,
      secondMarkPercent: questionitem.secondMarkPercent,
      arbitrator: arbitrator
    }
    result.adminAccount = result.adminAccount.concat(arbitrator)
  }
  if (!checkArrSame([...new Set(requestdata.markGroup.map(item => item.questionName).flat())], result.subjectiveQuestion.map(item => item.name))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的markGroup参数'
    }
  }
  if (olddata) {
    if (olddata.markGroup.length != requestdata.markGroup.length) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的markGroup参数'
      }
    }
    for (let i = 0; i < olddata.markGroup.length; i++) {
      const item = olddata.markGroup[i]
      const exist = requestdata.markGroup.find(ritem => ritem.name == item.name && checkArrEqual(ritem.questionName, item.questionName))
      if (!exist) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的markGroup参数'
        }
      }
    }
  }
  result.markGroup = requestdata.markGroup
  if (!olddata) {
    if (!Array.isArray(requestdata.volume)) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的volume参数'
      }
    }
    if (result.answerOnline && requestdata.volume.length > 1) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '在线作答仅支持一个分卷'
      }
    }
    const allobjectivequestionnamearr = []
    const allmarkgroupnamearr = []
    for (let i = 0; i < requestdata.volume.length; i++) {
      const volume = requestdata.volume[i]
      if (typeof (volume.name) != 'string' || !volume.name) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的volume参数'
        }
      }
      if (!Array.isArray(volume.page) || !volume.page.every(item => Array.isArray(item))) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的volume参数'
        }
      }
      const objectivequestionnamearr = []
      let subjectivequestionnamearr = []
      for (let j = 0; j < volume.page.length; j++) {
        for (let k = 0; k < volume.page[j].length; k++) {
          const pageitem = volume.page[j][k]
          const markgroupnamearr = []
          if ((!pageitem.objectiveQuestionName && !pageitem.markGroupName) || (pageitem.objectiveQuestionName && pageitem.markGroupName)) {
            return {
              errCode: 400,
              errMsg: '请求参数错误',
              errFix: '传递有效的volume参数'
            }
          }
          if (pageitem.objectiveQuestionName) {
            if (objectivequestionnamearr.includes(pageitem.objectiveQuestionName)) {
              return {
                errCode: 400,
                errMsg: '请求参数错误',
                errFix: '传递有效的volume参数'
              }
            }
            const exist = result.objectiveQuestion.find(item => item.name == pageitem.objectiveQuestionName)
            if (!exist) {
              return {
                errCode: 400,
                errMsg: '请求参数错误',
                errFix: '传递有效的volume参数'
              }
            }
            if (!result.answerOnline) {
              if (!Array.isArray(pageitem.coord) || !pageitem.coord.every(item => isCoordValid(item)) || pageitem.coord.length != exist.option.length) {
                return {
                  errCode: 400,
                  errMsg: '请求参数错误',
                  errFix: '传递有效的volume参数'
                }
              }
              volume.page[j][k] = {
                objectiveQuestionName: pageitem.objectiveQuestionName,
                coord: pageitem.coord
              }
            }
            if (result.answerOnline) {
              volume.page[j][k] = {
                objectiveQuestionName: pageitem.objectiveQuestionName
              }
            }
            objectivequestionnamearr.push(pageitem.objectiveQuestionName)
            allobjectivequestionnamearr.push(pageitem.objectiveQuestionName)
          }
          if (pageitem.markGroupName) {
            if (markgroupnamearr.includes(pageitem.markGroupName)) {
              return {
                errCode: 400,
                errMsg: '请求参数错误',
                errFix: '传递有效的volume参数'
              }
            }
            const exist = result.markGroup.find(item => item.name == pageitem.markGroupName)
            if (!exist) {
              return {
                errCode: 400,
                errMsg: '请求参数错误',
                errFix: '传递有效的volume参数'
              }
            }
            if (checkArrHaveSameItem(subjectivequestionnamearr, exist.questionName)) {
              return {
                errCode: 400,
                errMsg: '请求参数错误',
                errFix: '传递有效的volume参数'
              }
            }
            if (!result.answerOnline) {
              if (!Array.isArray(pageitem.coord) || pageitem.coord.length == 0 || !pageitem.coord.every(item => isCoordValid(item))) {
                return {
                  errCode: 400,
                  errMsg: '请求参数错误',
                  errFix: '传递有效的volume参数'
                }
              }
              volume.page[j][k] = {
                markGroupName: pageitem.markGroupName,
                coord: pageitem.coord
              }
            }
            if (result.answerOnline) {
              volume.page[j][k] = {
                markGroupName: pageitem.markGroupName
              }
            }
            markgroupnamearr.push(pageitem.markGroupName)
            allmarkgroupnamearr.push(pageitem.markGroupName)
            subjectivequestionnamearr = subjectivequestionnamearr.concat(exist.questionName)
          }
        }
      }
      if (!Array.isArray(volume.optionalQuestion)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的volume参数'
        }
      }
      for (let j = 0; j < volume.optionalQuestion.length; j++) {
        const optionalquestionitem = volume.optionalQuestion[j]
        if (!Array.isArray(optionalquestionitem.name) || !optionalquestionitem.name.every(item => subjectivequestionnamearr.includes(item)) || optionalquestionitem.name.length < 2) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的volume参数'
          }
        }
        optionalquestionitem.name = [...new Set(optionalquestionitem.name)]
        if (!Number.isInteger(optionalquestionitem.selectCount) || optionalquestionitem.selectCount <= 0 || optionalquestionitem.selectCount >= optionalquestionitem.name.length) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的volume参数'
          }
        }
        volume.optionalQuestion[j] = {
          name: optionalquestionitem.name,
          selectCount: optionalquestionitem.selectCount
        }
      }
      if (!checkArrNotHaveSameItem(volume.optionalQuestion.map(item => item.name).flat())) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的volume参数'
        }
      }
      requestdata.volume[i] = {
        name: volume.name,
        page: volume.page,
        optionalQuestion: volume.optionalQuestion
      }
    }
    if (!checkArrNotHaveSameItem(requestdata.volume.map(item => item.name))) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的volume参数'
      }
    }
    if (!checkArrEqual(result.objectiveQuestion.map(item => item.name), [...new Set(allobjectivequestionnamearr)])) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的volume参数'
      }
    }
    if (!checkArrEqual(result.markGroup.map(item => item.name), [...new Set(allmarkgroupnamearr)])) {
      return {
        errCode: 400,
        errMsg: '请求参数错误',
        errFix: '传递有效的volume参数'
      }
    }
    result.volume = requestdata.volume
  }
  return {
    errCode: 0,
    errMsg: '成功',
    data: result
  }
}
function checkArrHaveSameItem(a, b) {
  return b.some(item => a.includes(item))
}
function checkArrNotHaveSameItem(arr) {
  return [...new Set(arr)].length == arr.length
}
function checkArrSame(a, b) {
  return a.length == b.length && checkArrNotHaveSameItem(a)
}
function checkArrEqual(a, b) {
  if (a.length != b.length) {
    return false
  }
  const sa = a.sort()
  const sb = b.sort()
  return sa.every((item, index) => item == sb[index])
}
function getTotalScoreFromQuestionName(result, name) {
  return result.subjectiveQuestion.find(item => item.name == name).stepScore.map(item => item[0]).reduce((sum, num) => sum + num, 0)
}
function isCoordValid(coord) {
  return Array.isArray(coord) && coord.length == 4 && coord.every(item => Number.isInteger(item) && item >= 0) && coord[2] > coord[0] && coord[3] > coord[1]
}
function isXyValid(xy) {
  return Array.isArray(xy) && xy.length == 2 && xy.every(item => Number.isInteger(item) && item >= 0)
}
module.exports = {
  checkSubjectConfig,
  isXyValid
}