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
  if (typeof (requestdata.name) != 'string' || !requestdata.name || requestdata.name.length > 255 || requestdata.name == '多学科' || ['/', '.', ','].some(ch => requestdata.name.includes(ch))) {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的name参数'
    }
  }
  const checkres = require('../util/checksubjectconfig').checkSubjectConfig(requestdata)
  if (checkres.errCode != 0) {
    return checkres
  } else {
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
      const examres = await db.collection('exam').findOne({
        examId: requestdata.id
      })
      if (!examres) {
        return {
          errCode: 400,
          errMsg: '考试不存在',
          errFix: '无修复建议'
        }
      }
      if (!(account.type == 'admin' && account.schoolId == examres.schoolId)) {
        const adminexist = examres.admin.find(item => item.account == account.account)
        if (!adminexist) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
        if (adminexist && !adminexist.permission.includes('manageSubject')) {
          return {
            errCode: 403,
            errMsg: '无权限',
            errFix: '无修复建议'
          }
        }
      }
      if (examres.end) {
        return {
          errCode: 400,
          errMsg: '考试已结束',
          errFix: '无修复建议'
        }
      }
      const examsubjectres = await db.collection('examsubject').findOne({
        examId: requestdata.id,
        $or: [
          {
            name: requestdata.name
          },
          {
            subSubject: requestdata.name
          }
        ]
      })
      if (examsubjectres) {
        return {
          errCode: 400,
          errMsg: '科目已存在',
          errFix: '无修复建议'
        }
      }
      if (checkres.data.class.length > 0) {
        let validclass = []
        if (!examres.schoolId) {
          validclass = await db.collection('class').find({}, {
            projection: {
              _id: false,
              classId: true
            }
          }).toArray()
        }
        if (examres.schoolId) {
          validclass = await db.collection('class').find({
            schoolId: examres.schoolId
          }, {
            projection: {
              _id: false,
              classId: true
            }
          }).toArray()
        }
        validclass = validclass.map(item => item.classId)
        if (checkres.data.class.some(item => !validclass.includes(item))) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的class参数'
          }
        }
      }
      if (checkres.data.adminAccount.length > 0) {
        let validadmins = []
        if (!examres.schoolId) {
          validadmins = await db.collection('account').find({
            type: {
              $ne: 'student'
            }
          }, {
            projection: {
              _id: false,
              account: true
            }
          }).toArray()
        }
        if (examres.schoolId) {
          validadmins = await db.collection('account').find({
            schoolId: examres.schoolId,
            type: {
              $ne: 'student'
            }
          }, {
            projection: {
              _id: false,
              account: true
            }
          }).toArray()
        }
        validadmins = validadmins.map(item => item.account)
        if (checkres.data.adminAccount.some(item => !validadmins.includes(item))) {
          return {
            errCode: 400,
            errMsg: '请求参数错误',
            errFix: '传递有效的参数'
          }
        }
      }
      if (!checkres.data.answerOnline) {
        await db.collection('examsubject').insertOne({
          examId: requestdata.id,
          name: requestdata.name,
          markStatus: 'paused',
          class: checkres.data.class,
          subSubject: checkres.data.subSubject,
          answerOnline: false,
          admin: checkres.data.admin,
          adminAccount: checkres.data.adminAccount,
          objectiveQuestion: checkres.data.objectiveQuestion,
          subjectiveQuestion: checkres.data.subjectiveQuestion,
          markGroup: checkres.data.markGroup,
          volume: checkres.data.volume,
          createTime: Date.now()
        })
      }
      if (checkres.data.answerOnline) {
        await db.collection('examsubject').insertOne({
          examId: requestdata.id,
          name: requestdata.name,
          markStatus: 'paused',
          class: checkres.data.class,
          subSubject: checkres.data.subSubject,
          answerOnline: true,
          startTime: checkres.data.startTime,
          endTime: checkres.data.endTime,
          admin: checkres.data.admin,
          adminAccount: checkres.data.adminAccount,
          objectiveQuestion: checkres.data.objectiveQuestion,
          subjectiveQuestion: checkres.data.subjectiveQuestion,
          markGroup: checkres.data.markGroup,
          volume: checkres.data.volume,
          createTime: Date.now()
        })
      }
      return {
        errCode: 0,
        errMsg: '成功'
      }
    }
  }
}