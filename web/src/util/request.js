import cookie from 'js-cookie'
export default async function request({ apiPath, body, authorization }) {
  const loading = TinyLoading.service({
    lock: true,
    size: 'large',
    background: 'rgba(0, 0, 0, 0.5)'
  })
  try {
    const res = await fetch('http://' + window.location.host + '/api' + apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization ? authorization : cookie.get('authorization')
      },
      body: JSON.stringify(body)
    })
    loading.close()
    if (res.status != 200) {
      TinyModal.message({
        message: 'HTTP 请求失败，状态码：' + res.status,
        status: 'error'
      })
      throw '失败'
    }
    const data = await res.json()
    if (data.errCode == 0) {
      return data
    }
    TinyNotify({
      type: 'error',
      title: '接口调用失败，错误码：' + data.errCode,
      message: '错误信息：' + data.errMsg + '；修复方法：' + data.errFix,
      position: 'top-right'
    })
    throw '失败'
  } catch (err) {
    loading.close()
    if (err == '失败') {
      throw err
    }
    TinyModal.message({
      message: '请求失败：' + err.message,
      status: 'error'
    })
    throw err
  }
}