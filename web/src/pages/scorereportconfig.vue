<script setup>
document.title = '智能阅卷系统 - 考试管理 - 成绩报告配置'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { readFile } from '../util/file'
import request from '../util/request'
import time from '../util/time'
const route = useRoute()
const info = route.query.info
const param = ref({})
if (info) {
  try {
    param.value = decode(info)
  } catch {
  }
}
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  const countres = await request({
    apiPath: '/getScorereportconfigCount',
    body: {
      id: param.value.examId,
      subject: param.value.subject
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getScorereportconfigList',
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
      updateTime: time(item.updateTime),
      updateTimeSeen: item.updateTime == -1 ? false : true,
      idArray: item.subject == '多学科' ? item.scorereportconfigIdArray.join('、') : ''
    }
  })
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
async function generateScorereportconfig(id) {
  await request({
    apiPath: '/generateScorereport',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '操作成功',
    status: 'success'
  })
  get()
}
async function newScorereportconfig() {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
    info.id = param.value.examId
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (param.value.subject == '多学科' && info.subject != '多学科') {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
    return
  }
  if (info) {
    await request({
      apiPath: '/newScorereportconfig',
      body: info
    })
    TinyModal.message({
      message: '新增成功',
      status: 'success'
    })
    get()
  }
}
async function updateStudentVisible(id) {
  await request({
    apiPath: '/updateScorereportconfigStudentVisible',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '操作成功',
    status: 'success'
  })
  get()
}
async function updateScorereportconfig(id) {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
    info.id = id
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (param.value.subject == '多学科' && info.subject != '多学科') {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
    return
  }
  if (info) {
    await request({
      apiPath: '/updateScorereportconfig',
      body: info
    })
    TinyModal.message({
      message: '修改成功',
      status: 'success'
    })
    get()
  }
}
async function deleteScorereportconfig(id) {
  await request({
    apiPath: '/deleteScorereportconfig',
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
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingexam' }" label="考试管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/scorereportconfig' }" label="成绩报告配置"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <tiny-button type="success" @click="newScorereportconfig">选择配置文件新增</tiny-button>
      <tiny-button type="info" @click="get">刷新</tiny-button>
    </div>
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="sp">
              <div class="large-bold-text">{{ item.name }}</div>
              <tiny-tag v-if="item.type == 'system'" type="info">系统</tiny-tag>
              <tiny-tag v-if="item.type == 'custom'" type="info">自定义</tiny-tag>
            </div>
            <div>科目：{{ item.subject }}</div>
            <div v-if="item.subject == '多学科'">合并成绩报告配置ID：{{ item.idArray }}</div>
            <div v-if="item.updateTimeSeen == true">最近生成时间：{{ item.updateTime }}</div>
            <div style="cursor:pointer" @click="copy(item.scorereportconfigId)">ID：{{ item.scorereportconfigId }}</div>
            <tiny-checkbox v-model="item.studentVisible"
              @change="updateStudentVisible(item.scorereportconfigId)">学生可查看</tiny-checkbox>
          </div>
          <div v-if="item.status != 'processing'" class="sp">
            <tiny-button type="success" :disabled="item.status == 'processing'"
              @click="generateScorereportconfig(item.scorereportconfigId)">生成</tiny-button>
            <tiny-button type="info" @click="updateScorereportconfig(item.scorereportconfigId)">选择配置文件修改</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteScorereportconfig(item.scorereportconfigId)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
          <div v-if="item.status == 'processing'"><tiny-tag type="warning">生成中</tiny-tag></div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>