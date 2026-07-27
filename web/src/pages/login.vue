<script setup>
document.title = '智能阅卷系统 - 登录'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import request from '../util/request'
import router from '../router'
const route = useRoute()
const account = ref('')
const password = ref('')
function routePush() {
  router.push('/panel')
}
if (localStorage.getItem('authorization')) {
  routePush()
}
async function login() {
  if (account.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的账号',
      status: 'warning'
    })
    return
  }
  if (password.value.length < 8) {
    TinyModal.message({
      message: '请输入有效的密码',
      status: 'warning'
    })
    return
  }
  const res = await request({
    apiPath: '/getAccountInfo',
    authorization: 'Basic ' + btoa(account.value + ':' + password.value)
  })
  const expires = new Date(Date.now() + 604800000)
  localStorage.setItem('authorization', 'Basic ' + btoa(account.value + ':' + password.value))
  localStorage.setItem('accountinfo', JSON.stringify(res.data))
  routePush()
  TinyModal.message({
    message: '登录成功',
    status: 'success'
  })
}
</script>

<template>
  <div class="in-container">
    <div class="kuang">
      <div class="cz">
        <div class="title">登录</div>
        <tiny-form>
          <tiny-form-item label="账号">
            <tiny-input v-model="account" clearable minlength="36" maxlength="36" autocomplete="username"
              placeholder="请输入账号"></tiny-input>
          </tiny-form-item>
          <tiny-form-item label="密码">
            <tiny-input v-model="password" type="password" clearable show-password minlength="8" maxlength="32"
              autocomplete="password" placeholder="请输入密码"></tiny-input>
          </tiny-form-item>
          <tiny-form-item>
            <tiny-button type="success" @click="login">登录</tiny-button>
          </tiny-form-item>
        </tiny-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cz {
  align-items: center;
}

.title {
  text-align: center;
}
</style>