<script setup>
document.title = '智能阅卷系统 - 阅卷任务 - 进行中'
import { ref } from 'vue'
import { encode } from '../util/code'
import { readFile } from '../util/file'
import request from '../util/request'
import router from '../router'
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  const countres = await request({
    apiPath: '/getMarkTaskCount',
    body: {
      end: false
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getMarkTaskList',
    body: {
      end: false,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data.map(item => {
    const date = new Date(item.examTime)
    item.examTime = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    item.normalmarkgroupname = item.normalMarkGroupName.join('、')
    item.arbitratemarkgroupname = item.arbitrateMarkGroupName.join('、')
    item.adminmarkgroupname = item.adminMarkGroupName.join('、')
    return item
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
function mark(info, type) {
  const param = {
    info: info,
    type: type
  }
  router.push('/mark?info=' + encode(param))
}
function markProgress(info) {
  router.push('/markprogress?info=' + encode({
    examId: info.examId,
    examName: info.examName,
    examType: info.examType,
    examTime: info.examTime,
    subject: info.subject.name,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function dealQuestion(info) {
  router.push('/dealquestion?info=' + encode({
    examId: info.examId,
    examName: info.examName,
    examType: info.examType,
    examTime: info.examTime,
    subject: info.subject.name,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
async function updateSubject(param) {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
    info.id = param.examId
    info.name = param.subject.name
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (info) {
    await request({
      apiPath: '/updateExamSubject',
      body: info
    })
    TinyModal.message({
      message: '修改成功',
      status: 'success'
    })
    get()
  }
}
async function updateMarkStatus(param, markstatus) {
  TinyModal.confirm({
    status: 'info',
    title: '提示',
    message: '确定操作？',
    events: {
      async confirm() {
        await request({
          apiPath: '/updateExamSubjectMarkStatus',
          body: {
            id: param.examId,
            name: param.subject.name,
            markStatus: markstatus
          }
        })
        TinyModal.message({
          message: '操作成功',
          status: 'success'
        })
        get()
      }
    }
  })
}
function config(param) {
  router.push('/examsubjectconfig?info=' + encode({
    ...param.subject,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function answer(param) {
  router.push('/examsubjectanswer?info=' + encode({
    examId: param.examId,
    subject: param.subject.name,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function scorereportconfig(param) {
  router.push('/scorereportconfig?info=' + encode({
    examId: param.examId,
    subject: param.subject.name,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function supplyscore(param) {
  router.push('/supplyscore?info=' + encode({
    examId: param.examId,
    examName: param.examName,
    examType: param.examType,
    examTime: param.examTime,
    subject: param.subject,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function updatescore(param) {
  router.push('/updatescore?info=' + encode({
    examId: param.examId,
    examName: param.examName,
    examType: param.examType,
    examTime: param.examTime,
    subject: param.subject.name,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
function markqualitymonitor(param) {
  router.push('/markqualitymonitor?info=' + encode({
    examId: param.examId,
    examName: param.examName,
    examType: param.examType,
    examTime: param.examTime,
    subject: param.subject,
    backpath: '/processingmarktask',
    backname: '阅卷任务'
  }))
}
</script>

<template>
  <div class="cz">
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="sp">
              <div class="large-bold-text">{{ item.examName }}</div>
              <tiny-tag type="info">{{ item.examType }}</tiny-tag>
            </div>
            <div>时间：{{ item.examTime }}</div>
            <div>科目：{{ item.subject.name }}</div>
          </div>
          <div class="sp">
            <tiny-tag v-if="item.markStatus == 'paused'" type="warning">未开始</tiny-tag>
            <tiny-tag v-if="item.markStatus == 'processing'" type="info">阅卷中</tiny-tag>
          </div>
        </div>
        <div class="line"></div>
        <div class="cz">
          <div v-if="item.normalmarkgroupname != ''" class="cz">
            <div class="spacebetween">
              <div>普通【{{ item.normalmarkgroupname }}】</div>
              <tiny-button type="success" :disabled="item.markStatus == 'paused'"
                @click="mark(item, 'normal')">阅卷</tiny-button>
            </div>
            <div class="line"></div>
          </div>
          <div v-if="item.arbitratemarkgroupname != ''" class="cz">
            <div class="spacebetween">
              <div>仲裁【{{ item.arbitratemarkgroupname }}】</div>
              <tiny-button type="info" :disabled="item.markStatus == 'paused'"
                @click="mark(item, 'arbitrate')">仲裁</tiny-button>
            </div>
            <div class="line"></div>
          </div>
          <div v-if="item.admin == true" class="cz">
            <div class="spacebetween">
              <div>科组长</div>
              <div class="sp">
                <tiny-button type="success" @click="markProgress(item)">阅卷进度</tiny-button>
                <tiny-button type="warning" @click="dealQuestion(item)">处理问题卷</tiny-button>
                <tiny-dropdown type="info" :show-icon="false">
                  <template #default>
                    <tiny-button type="info">工具箱</tiny-button>
                  </template>
                  <template #dropdown>
                    <tiny-dropdown-menu placement="bottom-start">
                      <tiny-dropdown-item @click="updateSubject(item)">编辑配置</tiny-dropdown-item>
                      <tiny-dropdown-item @click="config(item)">查看配置</tiny-dropdown-item>
                      <tiny-dropdown-item v-if="item.markStatus == 'paused'"
                        @click="updateMarkStatus(item, 'processing')">开始阅卷</tiny-dropdown-item>
                      <tiny-dropdown-item v-if="item.markStatus == 'processing'"
                        @click="updateMarkStatus(item, 'paused')">暂停阅卷</tiny-dropdown-item>
                      <tiny-dropdown-item v-if="item.markStatus == 'processing'"
                        @click="updateMarkStatus(item, 'end')">结束阅卷</tiny-dropdown-item>
                      <tiny-dropdown-item @click="answer(item)">作答记录</tiny-dropdown-item>
                      <tiny-dropdown-item @click="markqualitymonitor(item)">阅卷质量监控</tiny-dropdown-item>
                      <tiny-dropdown-item @click="scorereportconfig(item)">成绩报告配置</tiny-dropdown-item>
                      <tiny-dropdown-item @click="supplyscore(item)">成绩补录</tiny-dropdown-item>
                    </tiny-dropdown-menu>
                  </template>
                </tiny-dropdown>
              </div>
            </div>
            <div class="line"></div>
          </div>
          <div v-if="item.adminmarkgroupname != ''" class="cz">
            <div class="spacebetween">
              <div>题组长【{{ item.adminmarkgroupname }}】</div>
              <div class="sp">
                <tiny-button type="success" @click="markProgress(item)">阅卷进度</tiny-button>
                <tiny-button type="warning" @click="dealQuestion(item)">处理问题卷</tiny-button>
              </div>
            </div>
            <div class="line"></div>
          </div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>