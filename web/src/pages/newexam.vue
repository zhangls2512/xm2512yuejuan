<script setup>
document.title = '智能阅卷系统 - 考试管理 - 新增考试'
import { ref } from 'vue'
import request from '../util/request'
import router from '../router'
const name = ref('')
const type = ref('')
const time = ref('')
const admin = ref([])
const account = ref('')
const accountpermission = ref([])
const permission = ref([
  {
    value: 'updateExamEndStatus',
    label: '结束、重启考试'
  },
  {
    value: 'updateExamInfo',
    label: '修改考试信息'
  },
  {
    value: 'deleteExam',
    label: '删除考试'
  },
  {
    value: 'manageSubject',
    label: '管理科目'
  },
  {
    value: 'manageScorereportconfig',
    label: '管理多学科成绩报告配置'
  }
])
function addAdmin() {
  if (account.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的账号',
      status: 'warning'
    })
    return
  }
  if (admin.value.find(item => item.account == account.value)) {
    TinyModal.message({
      message: '账号已存在',
      status: 'warning'
    })
    return
  }
  admin.value.push({
    account: account.value,
    permission: accountpermission.value
  })
  account.value = ''
  accountpermission.value = []
}
function removeAdmin(index) {
  admin.value.splice(index, 1)
}
async function newExam() {
  if (!name.value) {
    TinyModal.message({
      message: '请输入名称',
      status: 'warning'
    })
    return
  }
  if (!type.value) {
    TinyModal.message({
      message: '请输入类型',
      status: 'warning'
    })
    return
  }
  if (!time.value) {
    TinyModal.message({
      message: '请选择时间',
      status: 'warning'
    })
    return
  }
  const res = await request({
    apiPath: '/newExam',
    body: {
      name: name.value,
      type: type.value,
      time: new Date(time.value).getTime(),
      admin: admin.value
    }
  })
  TinyModal.message({
    message: '新增成功',
    status: 'success'
  })
  router.push('/processingexam')
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingexam' }" label="考试管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/newexam' }" label="新增考试"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <tiny-form>
      <tiny-form-item label="名称">
        <tiny-input v-model="name" clearable placeholder="请输入名称"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="类型">
        <tiny-input v-model="type" clearable placeholder="请输入类型"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="时间">
        <tiny-date-picker v-model="time" placeholder="请选择日期"></tiny-date-picker>
      </tiny-form-item>
      <tiny-form-item label="管理员">
        <div class="cz">
          <tiny-input v-model="account" clearable minlength="36" maxlength="36" placeholder="请输入账号"></tiny-input>
          <tiny-checkbox-group v-model="accountpermission">
            <tiny-checkbox v-for="item in permission" :label="item.value">{{ item.label }}</tiny-checkbox>
          </tiny-checkbox-group>
          <tiny-button type="success" @click="addAdmin">添加</tiny-button>
          <tiny-grid :data="admin">
            <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
            <tiny-grid-column field="permission" title="权限" align="center" show-overflow></tiny-grid-column>
            <tiny-grid-column title="操作" align="center">
              <template #default="{ $rowIndex }">
                <tiny-button type="danger" @click="removeAdmin($rowIndex)">删除</tiny-button>
              </template>
            </tiny-grid-column>
          </tiny-grid>
        </div>
      </tiny-form-item>
      <tiny-form-item>
        <tiny-button type="success" @click="newExam">新增</tiny-button>
      </tiny-form-item>
    </tiny-form>
  </div>
</template>