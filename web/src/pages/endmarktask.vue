<script setup>
document.title = '智能阅卷系统 - 阅卷任务 - 已结束'
import { ref } from 'vue'
import { encode } from '../util/code'
import { saveFile } from '../util/file'
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
      end: true
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getMarkTaskList',
    body: {
      end: true,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data.map(item => {
    const date = new Date(item.examTime)
    item.examTime = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
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
async function updateMarkStatus(param) {
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
            markStatus: 'paused'
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
function config(info) {
  router.push('/examsubjectconfig?info=' + encode({
    ...info.subject,
    backpath: '/endmarktask',
    backname: '阅卷任务'
  }))
}
function markProgress(param) {
  router.push('/markprogress?info=' + encode({
    examId: param.examId,
    examName: param.examName,
    examType: param.examType,
    examTime: param.examTime,
    subject: param.subject.name,
    backpath: '/endmarktask',
    backname: '阅卷任务'
  }))
}
async function getAnswerCsv(param) {
  const res = await request({
    apiPath: '/getAnswerCsv',
    body: {
      id: param.examId,
      name: param.subject.name
    }
  })
  saveFile(res.data, param.examName + '（' + param.subject.name + '）小题明细.csv')
}
function scorereportconfig(param) {
  router.push('/scorereportconfig?info=' + encode({
    examId: param.examId,
    subject: param.subject.name,
    backpath: '/endmarktask',
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
    backpath: '/endmarktask',
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
    backpath: '/endmarktask',
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
          <div v-if="item.admin == true" class="sp">
            <tiny-dropdown type="info" :show-icon="false">
              <template #default>
                <tiny-button type="info">工具箱</tiny-button>
              </template>
              <template #dropdown>
                <tiny-dropdown-menu placement="bottom-start">
                  <tiny-dropdown-item @click="updateMarkStatus(item)">重新阅卷</tiny-dropdown-item>
                  <tiny-dropdown-item @click="getAnswerCsv(item)">导出小题明细</tiny-dropdown-item>
                  <tiny-dropdown-item @click="config(item)">查看配置</tiny-dropdown-item>
                  <tiny-dropdown-item @click="markProgress(item)">阅卷进度</tiny-dropdown-item>
                  <tiny-dropdown-item @click="scorereportconfig(item)">成绩报告配置</tiny-dropdown-item>
                  <tiny-dropdown-item @click="supplyscore(item)">成绩补录</tiny-dropdown-item>
                  <tiny-dropdown-item @click="updatescore(item)">修改分数</tiny-dropdown-item>
                </tiny-dropdown-menu>
              </template>
            </tiny-dropdown>
          </div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>