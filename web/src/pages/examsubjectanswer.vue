<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
import time from '../util/time'
const param = ref({})
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
const studentaccount = ref('')
const dialog = ref(false)
const answer = ref([])
async function get() {
  const countres = await request({
    apiPath: '/getAnswerCount',
    body: {
      id: param.value.examId,
      subject: param.value.subject
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getAnswerList',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data.map(item => {
    return {
      ...item,
      createTime: time(item.createTime)
    }
  })
}
const route = useRoute()
const info = route.query.info
if (info) {
  try {
    param.value = decode(info)
    document.title = '智能阅卷系统 - ' + param.value.backname + ' - 作答记录'
    get()
  } catch {
  }
}
async function currentpageChange(t) {
  currentpage.value = t
  get()
}
async function pagesizeChange(t) {
  pagesize.value = t
  get()
}
async function search() {
  if (!studentaccount.value) {
    get()
    return
  }
  if (studentaccount.value && studentaccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的学生账号',
      status: 'warning'
    })
    return
  }
  const res = await request({
    apiPath: '/searchAnswer',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      studentAccount: studentaccount.value
    }
  })
  data.value = res.data.map(item => {
    return {
      ...item,
      createTime: time(item.createTime)
    }
  })
}
async function openDialog(stu) {
  await getAnswerInfo(stu)
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
  answer.value = []
}
async function getAnswerInfo(id) {
  const res = await request({
    apiPath: '/getAnswerInfo',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      studentAccount: id
    }
  })
  answer.value = res.data
}
async function deleteAnswer(id) {
  await request({
    apiPath: '/deleteAnswer',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      studentAccount: id
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
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: param.backpath }" :label="param.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/examsubjectanswer' }" label="作答记录"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <tiny-input v-model="studentaccount" clearable minlength="36" maxlength="36" placeholder="请输入学生账号"></tiny-input>
      <tiny-button type="info" @click="search">搜索</tiny-button>
    </div>
    <tiny-grid :data="data">
      <tiny-grid-column field="studentAccount" title="学生账号" align="center"></tiny-grid-column>
      <tiny-grid-column field="createTime" title="时间" align="center"></tiny-grid-column>
      <tiny-grid-column title="操作" align="center">
        <template #default="{ row }">
          <div class="czsp">
            <tiny-button type="info" @click="openDialog(row.studentAccount)">查看</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后会同步清空其阅卷记录且无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteAnswer(row.studentAccount)">
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
    <tiny-dialog-box class="dialog" :visible="dialog" title="作答" @close="closeDialog">
      <div class="cz">
        <div v-for="item in answer">
          <img v-if="item" :src="item"></img>
          <img v-if="!item" src="/noimage.png"></img>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeDialog">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>