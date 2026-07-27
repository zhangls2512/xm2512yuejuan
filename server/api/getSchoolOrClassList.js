'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
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
    const result = {
      school: [],
      class: []
    }
    if (!account.schoolId) {
      const schoolres = await db.collection('account').find({
        type: 'admin',
        schoolId: {
          $ne: ''
        }
      }).toArray()
      result.school = schoolres.map(item => {
        return {
          id: item.schoolId,
          name: item.schoolName
        }
      })
      const schoolmap = {}
      result.school.forEach(item => {
        schoolmap[item.id] = item.name
      })
      const classres = await db.collection('class').find({}).toArray()
      result.class = classres.map(item => {
        return {
          id: item.classId,
          name: item.name + '（学校：' + schoolmap[item.schoolId] + '）'
        }
      })
    }
    if (account.schoolId) {
      const data = await db.collection('class').find({
        schoolId: account.schoolId
      }).toArray()
      result.class = data.map(item => {
        return {
          id: item.classId,
          name: item.name
        }
      })
    }
    return {
      errCode: 0,
      errMsg: '成功',
      data: result
    }
  }
}