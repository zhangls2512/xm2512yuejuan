'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  let skip = 0
  let limit = 10
  if (Number.isInteger(requestdata.skip) && requestdata.skip >= 0) {
    skip = requestdata.skip
  }
  if (Number.isInteger(requestdata.limit) && requestdata.limit > 0 && requestdata.limit <= 20) {
    limit = requestdata.limit
  }
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.type == 'admin') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    let data = []
    if (account.type == 'student') {
      const idres = await db.collection('scorereportconfig').find({
        studentVisible: true,
        status: 'finished',
        student: account.account
      }).sort({
        updateTime: -1
      }).skip(skip).limit(limit).toArray()
      data = await db.collection('scorereport').find({
        scorereportconfigId: {
          $in: idres.map(item => item.scorereportconfigId)
        },
        type: 'joint'
      }, {
        projection: {
          _id: false,
          type: false
        }
      }).sort({
        createTime: -1
      }).skip(skip).limit(limit).toArray()
      data = data.map(item => {
        const student = item.student.find(i => i.studentAccount == account.account)
        delete student.studentAccount
        delete student.jointRank
        return {
          scorereportconfigId: item.scorereportconfigId,
          examId: item.examId,
          examName: item.examName,
          subject: item.subject,
          info: student
        }
      })
    }
    if (account.type == 'teacher') {
      if (!['joint', 'school', 'class'].includes(requestdata.type)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的type参数'
        }
      }
      if (typeof (requestdata.subject) != 'string' || !requestdata.subject) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的subject参数'
        }
      }
      if (requestdata.type != 'joint' && (typeof (requestdata.id) != 'string' || requestdata.id.length != 36)) {
        return {
          errCode: 400,
          errMsg: '请求参数错误',
          errFix: '传递有效的id参数'
        }
      }
      if (requestdata.type == 'joint') {
        const idres = await db.collection('scorereportconfig').find({
          subject: requestdata.subject,
          status: 'finished',
          jointVisibleAccount: account.account
        }).sort({
          updateTime: -1
        }).skip(skip).limit(limit).toArray()
        data = await db.collection('scorereport').find({
          scorereportconfigId: {
            $in: idres.map(item => item.scorereportconfigId)
          },
          type: 'joint'
        }, {
          projection: {
            _id: false,
            type: false
          }
        }).sort({
          createTime: -1
        }).skip(skip).limit(limit).toArray()
      }
      if (requestdata.type == 'school') {
        const idres = await db.collection('scorereportconfig').find({
          subject: requestdata.subject,
          status: 'finished',
          schoolVisibleAccount: account.account
        }).sort({
          updateTime: -1
        }).skip(skip).limit(limit).toArray()
        data = await db.collection('scorereport').find({
          scorereportconfigId: {
            $in: idres.map(item => item.scorereportconfigId)
          },
          type: 'school',
          schoolId: requestdata.id
        }, {
          projection: {
            _id: false,
            type: false,
            schoolId: false
          }
        }).sort({
          createTime: -1
        }).skip(skip).limit(limit).toArray()
      }
      if (requestdata.type == 'class') {
        const classres = await db.collection('class').findOne({
          classId: requestdata.id
        })
        let classteacher = false
        if (classres) {
          const subject = classres.subject.find(item => item.name == requestdata.subject)
          if (subject && subject.teacher.includes(account.account)) {
            classteacher = true
          }
        }
        let idres
        if (!classteacher) {
          idres = await db.collection('scorereportconfig').find({
            subject: requestdata.subject,
            status: 'finished',
            classVisibleAccount: account.account
          }).sort({
            updateTime: -1
          }).skip(skip).limit(limit).toArray()
        }
        if (classteacher) {
          idres = await db.collection('scorereportconfig').find({
            subject: requestdata.subject,
            status: 'finished',
            $or: [
              {
                classVisibleAccount: account.account
              },
              {
                classTeacherVisible: true
              }
            ]
          }).sort({
            updateTime: -1
          }).skip(skip).limit(limit).toArray()
        }
        data = await db.collection('scorereport').find({
          scorereportconfigId: {
            $in: idres.map(item => item.scorereportconfigId)
          },
          type: 'class',
          classId: requestdata.id
        }, {
          projection: {
            _id: false,
            type: false,
            classId: false
          }
        }).sort({
          createTime: -1
        }).skip(skip).limit(limit).toArray()
      }
    }
    const exammap = {}
    const promises = [...new Set(data.map(item => item.examId))].map(async (item) => {
      const examgetres = await db.collection('exam').findOne({
        examId: item
      })
      exammap[item] = examgetres ? examgetres.name : '未知'
    })
    await Promise.all(promises)
    data.forEach(item => {
      item.examName = exammap[item.examId]
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: data
    }
  }
}