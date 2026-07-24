<script setup>
document.title = '智能阅卷系统 - 考试管理 - 进行中'
import { ref } from 'vue'
import { encode } from '../util/code'
import { readFile, saveFile } from '../util/file'
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
      end: false
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getExamList',
    body: {
      end: false,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  TinyModal.message({
    message: '获取数据成功',
    status: 'success'
  })
  data.value = res.data.map(item => {
    const date = new Date(item.time)
    item.time = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    item.subjectName = item.subject.map(s => s.name).join('、')
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
function newExam() {
  router.push('/newexam')
}
async function newSubject(id) {
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
  if (info) {
    await request({
      apiPath: '/newExamSubject',
      body: info
    })
    TinyModal.message({
      message: '新增成功',
      status: 'success'
    })
    get()
  }
}
async function updateSubject(id, subject) {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
    info.id = id
    info.name = subject
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
async function deleteSubject(id, subject) {
  await request({
    apiPath: '/deleteExamSubject',
    body: {
      id: id,
      name: subject
    }
  })
  TinyModal.message({
    message: '删除成功',
    status: 'success'
  })
  get()
}
async function updateMarkStatus(id, subject, markstatus) {
  TinyModal.confirm({
    status: 'info',
    title: '提示',
    message: '确定操作？',
    events: {
      async confirm() {
        await request({
          apiPath: '/updateExamSubjectMarkStatus',
          body: {
            id: id,
            name: subject,
            markStatus: markstatus
          }
        })
        if (markstatus != 'end') {
          TinyModal.message({
            message: '操作成功',
            status: 'success'
          })
        }
        if (markstatus == 'end') {
          TinyModal.message({
            message: '操作成功',
            status: 'success'
          })
        }
        get()
      }
    }
  })
}
function config(info) {
  router.push('/examsubjectconfig?info=' + encode(info))
}
function answer(id, subject) {
  router.push('/examsubjectanswer?info=' + encode({
    examId: id,
    subject: subject
  }))
}
function markProgress(exam, subject) {
  router.push('/markprogress?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    source: 'exam'
  }))
}
function dealQuestion(exam, subject) {
  router.push('/dealquestion?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject,
    source: 'exam'
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
    subject: subject
  }))
}
function supplyscore(exam, subject) {
  router.push('/supplyscore?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject
  }))
}
function markqualitymonitor(exam, subject) {
  router.push('/markqualitymonitor?info=' + encode({
    examId: exam.examId,
    examName: exam.name,
    examType: exam.type,
    examTime: exam.time,
    subject: subject.name
  }))
}
function updateExam(info) {
  router.push('/updateexam?info=' + encode(info))
}
async function deleteExam(id) {
  await request({
    apiPath: '/deleteExam',
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
async function endExam(id) {
  await request({
    apiPath: '/endExam',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '结束成功',
    status: 'success'
  })
  get()
}
</script>

<template>
  <div class="cz">
    <div v-if="admin == true"><tiny-button type="success" @click="newExam">新增</tiny-button></div>
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="sp">
              <div class="large-bold-text">{{ item.name }}</div>
              <tiny-tag type="info">{{ item.type }}</tiny-tag>
            </div>
            <div>时间：{{ item.time }}</div>
            <div v-if="item.subjectName != ''">科目：{{ item.subjectName }}</div>
            <div style="cursor:pointer" @click="copy(item.examId)">ID：{{ item.examId }}</div>
          </div>
          <div class="sp">
            <tiny-button type="success" @click="newSubject(item.examId)">新增科目</tiny-button>
            <tiny-button type="info" @click="scorereportconfig(item.examId, '多学科')">多学科成绩报告配置</tiny-button>
            <tiny-button type="info" @click="updateExam(item)">修改</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteExam(item.examId)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
        </div>
        <div class="line"></div>
        <div v-for="subject in item.subject" class="cz">
          <div class="spacebetween">
            <div class="wide-sp">
              <div style="width:150px">【{{ subject.name }}】</div>
              <div v-if="admin == true" class="sp" style="width:400px">
                <div v-if="subject.markStatus != 'end'" class="clickwz"
                  @click="updateSubject(item.examId, subject.name)">○
                  编辑配置</div>
                <div v-if="subject.markStatus == 'end'" class="disabledwz">☑ 编辑配置</div>
                <div class="disabledwz">····</div>
                <div v-if="subject.markStatus == 'paused'" class="clickwz"
                  @click="updateMarkStatus(item.examId, subject.name, 'processing')">○ 开始阅卷</div>
                <div v-if="subject.markStatus == 'processing'" class="clickwz"
                  @click="updateMarkStatus(item.examId, subject.name, 'paused')">○ 暂停阅卷
                </div>
                <div v-if="subject.markStatus == 'processing'" class="disabledwz">····</div>
                <div v-if="subject.markStatus == 'processing'" class="clickwz"
                  @click="updateMarkStatus(item.examId, subject.name, 'end')">○ 结束阅卷
                </div>
                <div v-if="subject.markStatus == 'end'" class="clickwz"
                  @click="updateMarkStatus(item.examId, subject.name, 'paused')">○ 重新阅卷</div>
              </div>
              <div class="sp">
                <div v-if="subject.markStatus == 'end'" class="footer-text">阅卷已结束。</div>
                <div v-if="subject.markStatus != 'end'" class="clickwz" @click="config(subject)">查看配置</div>
                <div v-if="admin == true && subject.markStatus != 'end'" class="clickwz"
                  @click="answer(item.examId, subject.name)">作答记录</div>
                <div v-if="admin == true && subject.markStatus != 'end'" class="clickwz"
                  @click="markProgress(item, subject.name)">阅卷进度</div>
                <div v-if="admin == true && subject.markStatus != 'end'" class="clickwz"
                  @click="dealQuestion(item, subject.name)">处理问题卷</div>
                <div v-if="admin == true && subject.markStatus == 'end'" class="clickwz"
                  @click="getAnswerCsv(item, subject.name)">导出小题明细</div>
                <div v-if="admin == true && subject.markStatus == 'end'" class="clickwz"
                  @click="scorereportconfig(item.examId, subject.name)">成绩报告配置</div>
                <tiny-dropdown v-if="admin == true" :show-icon="false">
                  <template #default>
                    <div class="clickwz">更多</div>
                  </template>
                  <template #dropdown>
                    <tiny-dropdown-menu placement="bottom-start">
                      <tiny-dropdown-item @click="supplyscore(item, subject)">成绩补录</tiny-dropdown-item>
                      <tiny-dropdown-item v-if="subject.markStatus != 'end'"
                        @click="markqualitymonitor(item, subject)">阅卷质量监控</tiny-dropdown-item>
                    </tiny-dropdown-menu>
                  </template>
                </tiny-dropdown>
              </div>
            </div>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteSubject(item.examId, subject.name)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
          <div class="line"></div>
        </div>
        <div class="end">
          <tiny-popconfirm title="提示" message="确定结束考试？" type="warning" trigger="hover" @confirm="endExam(item.examId)">
            <template #reference>
              <tiny-button type="danger">结束考试</tiny-button>
            </template>
          </tiny-popconfirm>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>