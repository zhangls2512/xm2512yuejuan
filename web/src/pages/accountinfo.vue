<script setup>
document.title = '智能阅卷系统 - 账号信息'
import { ref } from 'vue'
import request from '../util/request'
import router from '../router'
const accountinfo = ref({})
const dialog = ref(false)
const newpassworda = ref('')
const newpasswordb = ref('')
const updatepasswordbutton = ref(false)
const typemap = {
  teacher: '老师',
  student: '学生'
}
const exist = localStorage.getItem('accountinfo')
if (exist) {
  accountinfo.value = JSON.parse(exist)
  if (accountinfo.value.type != 'admin') {
    accountinfo.value.typewz = typemap[accountinfo.value.type]
  }
  if (accountinfo.value.type == 'admin') {
    if (!accountinfo.value.schoolId) {
      accountinfo.value.typewz = '联考管理员'
    }
    if (accountinfo.value.schoolId) {
      accountinfo.value.typewz = '学校管理员'
    }
  }
}
function closeDialog() {
  dialog.value = false
  newpassworda.value = ''
  newpasswordb.value = ''
  updatepasswordbutton.value = false
}
function updatePasswordOpen() {
  dialog.value = true
  updatepasswordbutton.value = true
}
async function updatePassword() {
  if (newpassworda.value.length < 8 || newpassworda.value.length > 32) {
    TinyModal.message({
      message: '请输入有效的新密码',
      status: 'warning'
    })
    return
  }
  if (newpassworda.value != newpasswordb.value) {
    TinyModal.message({
      message: '两次输入的密码不一致',
      status: 'warning'
    })
    return
  }
  await request({
    apiPath: '/updateAccountPassword',
    body: {
      password: newpassworda.value
    }
  })
  closeDialog()
  TinyModal.message({
    message: '修改成功，请重新登录',
    status: 'success'
  })
  localStorage.removeItem('authorization')
  localStorage.removeItem('accountinfo')
  router.push('/login')
}
</script>

<template>
  <div>
    <div class="cz">
      <div class="large-bold-text">{{ accountinfo.name }}</div>
      <div class="sp">
        <div class="bold-text">账号</div>
        <div>{{ accountinfo.account }}</div>
      </div>
      <div class="sp">
        <div class="bold-text">密码</div>
        <tiny-button type="info" @click="updatePasswordOpen">修改</tiny-button>
      </div>
      <div class="sp">
        <div class="bold-text">身份</div>
        <div>{{ accountinfo.typewz }}</div>
      </div>
      <div v-if="accountinfo.schoolId != ''" class="sp">
        <div class="bold-text">学校 ID</div>
        <div>{{ accountinfo.schoolId }}</div>
      </div>
      <div v-if="accountinfo.schoolId != ''" class="sp">
        <div class="bold-text">学校名称</div>
        <div>{{ accountinfo.schoolName }}</div>
      </div>
    </div>
    <tiny-dialog-box class="dialog" :visible="dialog" title="修改密码" @close="closeDialog">
      <div class="dialog-cz">
        <tiny-input v-if="updatepasswordbutton == true" v-model="newpassworda" type="password" clearable show-password
          minlength="8" maxlength="32" autocomplete="new-password" placeholder="请输入新密码（长度 8 - 32 位）"></tiny-input>
        <tiny-input v-if="updatepasswordbutton == true" v-model="newpasswordb" type="password" clearable show-password
          minlength="8" maxlength="32" autocomplete="new-password" placeholder="请再次输入新密码"></tiny-input>
      </div>
      <template #footer>
        <tiny-button v-if="updatepasswordbutton == true" type="info" @click="updatePassword">修改</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>