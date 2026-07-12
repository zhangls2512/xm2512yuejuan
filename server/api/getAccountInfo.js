'use strict'
exports.main = async (event, configfilepath) => {
  const db = await (require('../util/db').database(configfilepath))
  const res = await require('../util/authcheck').main(event.headers, configfilepath)
  if (res.errCode != 0) {
    return res
  } else {
    const account = res.account
    if (account.schoolId) {
      const school = await db.collection('account').findOne({
        schoolId: account.schoolId,
        type: 'admin'
      })
      if (school) {
        account.schoolName = school.schoolName
      }
    }
    ['_id', 'password'].forEach(item => {
      delete account[item]
    })
    return {
      errCode: 0,
      errMsg: '成功',
      data: account
    }
  }
}