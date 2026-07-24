<script setup>
document.title = '智能阅卷系统 - 考试管理 - 已结束'
import { ref } from 'vue'
import request from '../util/request'
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
</script>

<template>
  <div class="cz">
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="sp">
          <div class="large-bold-text">{{ item.name }}</div>
          <tiny-tag type="info">{{ item.type }}</tiny-tag>
        </div>
        <div>时间：{{ item.time }}</div>
        <div v-if="item.subjectName != ''">科目：{{ item.subjectName }}</div>
        <div style="cursor:pointer" @click="copy(item.examId)">ID：{{ item.examId }}</div>
        <div class="line"></div>
        <div v-for="subject in item.subject" class="cz">
          <div class="spacebetween">
            <div class="wide-sp">
              <div style="width:150px">【{{ subject.name }}】</div>
              <div class="footer-text">阅卷已结束。</div>
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