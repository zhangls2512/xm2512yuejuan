<script setup>
document.title = '智能阅卷系统 - 账号管理 - 学生'
import { ref } from 'vue'
import request from '../util/request'
import router from '../router'
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
const account = ref('')
const dialog = ref(false)
const dialogtitle = ref('')
const name = ref('')
let updateaccount = ''
async function get() {
  const countres = await request({
    apiPath: '/getAccountCount',
    body: {
      type: 'student'
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getAccountList',
    body: {
      type: 'student',
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data
}
get()
async function currentpageChange(t) {
  currentpage.value = t
  get()
}
async function pagesizeChange(t) {
  pagesize.value = t
  get()
}
function openDialog(account, inputname) {
  if (!account) {
    dialogtitle.value = '新增'
  }
  if (account) {
    dialogtitle.value = '修改姓名'
    updateaccount = account
    name.value = inputname
  }
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
  dialogtitle.value = ''
  name.value = ''
  updateaccount = ''
}
async function submit() {
  if (!name.value) {
    TinyModal.message({
      message: '请输入姓名',
      status: 'warning'
    })
    return
  }
  if (!updateaccount) {
    await request({
      apiPath: '/newAccount',
      body: {
        type: 'student',
        name: name.value
      }
    })
    TinyModal.message({
      message: '新增成功',
      status: 'success'
    })
  }
  if (updateaccount) {
    await request({
      apiPath: '/updateAccountName',
      body: {
        account: updateaccount,
        name: name.value
      }
    })
    TinyModal.message({
      message: '修改成功',
      status: 'success'
    })
  }
  closeDialog()
  get()
}
async function copy(value) {
  await navigator.clipboard.writeText(value)
  TinyModal.message({
    message: '内容已复制',
    status: 'success'
  })
}
async function search() {
  if (!account.value) {
    get()
    return
  }
  if (account.value && account.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的账号',
      status: 'warning'
    })
    return
  }
  const userres = await request({
    apiPath: '/searchAccount',
    body: {
      type: 'student',
      account: account.value
    }
  })
  data.value = userres.data
}
async function resetAccountPassword(account) {
  await request({
    apiPath: '/resetAccountPassword',
    body: {
      account: account
    }
  })
  TinyModal.message({
    message: '重置成功',
    status: 'success'
  })
}
async function deleteAccount(account) {
  await request({
    apiPath: '/deleteAccount',
    body: {
      account: account
    }
  })
  TinyModal.message({
    message: '删除成功',
    status: 'success'
  })
  get()
}
</script>

<template>
  <div class="cz">
    <div><tiny-button type="success" @click="openDialog('')">新增</tiny-button></div>
    <div class="sp">
      <tiny-input v-model="account" clearable minlength="36" maxlength="36" placeholder="请输入账号"></tiny-input>
      <tiny-button type="info" @click="search">搜索</tiny-button>
    </div>
    <tiny-grid :data="data">
      <tiny-grid-column title="账号" align="center">
        <template #default="{ row }">
          <tiny-tooltip content="点击复制" placement="top">
            <div class="clickwz" @click="copy(row.account)">{{ row.account }}</div>
          </tiny-tooltip>
        </template>
      </tiny-grid-column>
      <tiny-grid-column field="name" title="姓名" align="center"></tiny-grid-column>
      <tiny-grid-column title="操作" align="center">
        <template #default="{ row }">
          <div class="czsp">
            <tiny-button type="info" @click="openDialog(row.account, row.name)">修改姓名</tiny-button>
            <tiny-button type="warning" @click="resetAccountPassword(row.account)">重置密码</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteAccount(row.account)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
        </template>
      </tiny-grid-column>
    </tiny-grid>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
    <tiny-dialog-box class="dialog" :visible="dialog" :title="dialogtitle" @close="closeDialog">
      <tiny-input v-model="name" clearable placeholder="请输入姓名"></tiny-input>
      <template #footer>
        <tiny-button type="info" @click="submit">提交</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>