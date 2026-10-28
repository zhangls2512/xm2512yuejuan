<script setup>
document.title = '智能阅卷系统 - 班级管理'
import { ref } from 'vue'
import { encode } from '../util/code'
import { readFile } from '../util/file'
import request from '../util/request'
import router from '../router'
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
const id = ref('')
async function get() {
  data.value = []
  const countres = await request({
    apiPath: '/getClassCount'
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getClassList',
    body: {
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
async function copy(value) {
  await navigator.clipboard.writeText(value)
  TinyModal.message({
    message: '内容已复制',
    status: 'success'
  })
}
async function search() {
  if (!id.value) {
    get()
    return
  }
  if (id.value && id.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的ID',
      status: 'warning'
    })
    return
  }
  currentpage.value = 1
  total.value = 0
  data.value = []
  const res = await request({
    apiPath: '/searchClass',
    body: {
      id: id.value
    }
  })
  total.value = res.data.length
  data.value = res.data
}
async function newClass() {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (info) {
    await request({
      apiPath: '/newClass',
      body: {
        name: info.name,
        student: info.student,
        subject: info.subject
      }
    })
    TinyModal.message({
      message: '新增成功',
      status: 'success'
    })
    get()
  }
}
function info(info) {
  router.push('/classinfo?info=' + encode(info))
}
async function updateClass(id) {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (info) {
    await request({
      apiPath: '/updateClass',
      body: {
        id: id,
        name: info.name,
        student: info.student,
        subject: info.subject
      }
    })
    TinyModal.message({
      message: '修改成功',
      status: 'success'
    })
    get()
  }
}
async function deleteClass(id) {
  await request({
    apiPath: '/deleteClass',
    body: {
      id: id
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
    <div><tiny-button type="success" @click="newClass">选择配置文件新增</tiny-button></div>
    <div class="sp">
      <tiny-input v-model="id" clearable minlength="36" maxlength="36" placeholder="请输入ID"></tiny-input>
      <tiny-button type="info" @click="search">搜索</tiny-button>
    </div>
    <tiny-grid :data="data">
      <tiny-grid-column title="ID" align="center">
        <template #default="{ row }">
          <tiny-tooltip content="点击复制" placement="top">
            <div class="clickwz" @click="copy(row.classId)">{{ row.classId }}</div>
          </tiny-tooltip>
        </template>
      </tiny-grid-column>
      <tiny-grid-column field="name" title="名称" align="center"></tiny-grid-column>
      <tiny-grid-column title="操作" align="center">
        <template #default="{ row }">
          <div class="czsp">
            <tiny-button type="info" @click="info(row)">详情</tiny-button>
            <tiny-button type="info" @click="updateClass(row.classId)">选择配置文件修改</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteClass(row.classId)">
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
  </div>
</template>