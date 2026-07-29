'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const requestdata = JSON.parse(event.body)
  if (typeof (requestdata.end) != 'boolean') {
    return {
      errCode: 400,
      errMsg: '请求参数错误',
      errFix: '传递有效的end参数'
    }
  }
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
    if (account.type == 'student') {
      return {
        errCode: 403,
        errMsg: '无权限',
        errFix: '无修复建议'
      }
    }
    let data = []
    if (account.type == 'admin') {
      data = await db.collection('exam').find({
        end: requestdata.end,
        $or: [
          {
            schoolId: account.schoolId
          },
          {
            adminAccount: account.account
          }
        ]
      }, {
        projection: {
          _id: false,
          schoolId: false,
          adminAccount: false,
          end: false
        }
      }).sort({
        time: -1
      }).skip(skip).limit(limit).toArray()
    }
    if (account.type == 'teacher') {
      data = await db.collection('exam').find({
        adminAccount: account.account,
        end: requestdata.end
      }, {
        projection: {
          _id: false,
          schoolId: false,
          adminAccount: false,
          end: false
        }
      }).sort({
        time: -1
      }).skip(skip).limit(limit).toArray()
    }
    const examids = data.map(item => item.examId)
    const examsubjectgetres = await db.collection('examsubject').find({
      examId: {
        $in: examids
      }
    }).toArray()
    examsubjectgetres.sort((a, b) => a.name.localeCompare(b.name))
    examsubjectgetres.forEach(item => {
      const index = examids.indexOf(item.examId)
      const deletekeys = ['_id', 'examId', 'adminAccount', 'subSubject', 'createTime']
      deletekeys.forEach(key => {
        delete item[key]
      })
      if (!data[index].subject) {
        data[index].subject = []
      }
      data[index].subject.push(item)
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: data
    }
  }
}