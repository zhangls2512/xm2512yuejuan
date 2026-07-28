<script setup>
document.title = '智能阅卷系统 - 考试管理 - 已结束'
import { ref } from 'vue'
import { encode } from '../util/code'
import { saveFile } from '../util/file'
import request from '../util/request'
import router from '../router'
const admin = ref(false)
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  const countres = await request({
    apiPath: '/getExamCount',
    body: {
      end: true
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getExamList',
    body: {
      end: true,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data.map(item => {
    const date = new Date(item.time)
    item.time = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    return item
  })
}
const exist = localStorage.getItem('accountinfo')
if (exist) {
  const accountinfo = JSON.parse(exist)
  if (accountinfo.type == 'admin') {
    admin.value = true
  }
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
async function restartExam(id) {
  await request({
    apiPath: '/restartExam',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '重启成功',
    status: 'success'
  })
  get()
}
function config(info) {
  router.push('/examsubjectconfig?info=' + encode({
    ...info,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
function markProgress(exam, subject) {
  router.push('/markprogress?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
function dealQuestion(exam, subject) {
  router.push('/dealquestion?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
async function getAnswerCsv(exam, subject) {
  const res = await request({
    apiPath: '/getAnswerCsv',
    body: {
      id: exam.examId,
      name: subject
    }
  })
  saveFile(res.data, exam.name + '（' + subject + '）小题明细.csv')
}
function scorereportconfig(examid, subject) {
  router.push('/scorereportconfig?info=' + encode({
    examId: examid,
    subject: subject,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
function supplyscore(exam, subject) {
  router.push('/supplyscore?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
function updatescore(exam, subject) {
  router.push('/updatescore?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject.name,
    backpath: '/endexam',
    backname: '考试管理'
  }))
}
function markqualitymonitor(exam, subject) {
  router.push('/markqualitymonitor?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    backpath: '/endexam',
    backname: '考试管理'
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
              <div class="large-bold-text">{{ item.name }}</div>
              <tiny-tag type="info">{{ item.type }}</tiny-tag>
            </div>
            <div class="sp">
              <div class="bold-text">时间</div>
              <div>{{ item.time }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">科目</div>
              <tiny-tag v-for="i in item.subject" type="info">{{ i.name }}</tiny-tag>
            </div>
            <div class="sp">
              <div class="bold-text">ID</div>
              <div class="clickwz" @click="copy(item.examId)">{{ item.examId }}</div>
            </div>
          </div>
          <div class="sp">
            <tiny-button type="info" @click="scorereportconfig(item.examId, '多学科')">多学科成绩报告配置</tiny-button>
          </div>
        </div>
        <div class="line"></div>
        <div v-for="subject in item.subject" class="cz">
          <div class="spacebetween">
            <div class="wide-sp">
              <div style="width:150px">【{{ subject.name }}】</div>
              <div class="sp">
                <div class="footer-text">阅卷已结束。</div>
                <div v-if="admin == true" class="clickwz" @click="getAnswerCsv(item, subject.name)">导出小题明细</div>
                <div class="clickwz" @click="config(subject)">查看配置</div>
                <div v-if="admin == true" class="clickwz" @click="markProgress(item, subject.name)">阅卷进度</div>
                <div v-if="admin == true" class="clickwz" @click="scorereportconfig(item.examId, subject.name)">成绩报告配置
                </div>
                <div v-if="admin == true" class="clickwz" @click="supplyscore(item, subject)">成绩补录</div>
                <div v-if="admin == true" class="clickwz" @click="updatescore(item, subject)">修改分数</div>
              </div>
            </div>
          </div>
          <div class="line"></div>
        </div>
        <div class="end">
          <tiny-popconfirm title="提示" message="确定重启考试？" type="warning" trigger="hover"
            @confirm="restartExam(item.examId)">
            <template #reference>
              <tiny-button type="info">重启考试</tiny-button>
            </template>
          </tiny-popconfirm>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>