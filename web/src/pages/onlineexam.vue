<script setup>
document.title = '智能阅卷系统 - 在线考试'
import { ref } from 'vue'
import { encode } from '../util/code'
import request from '../util/request'
import time from '../util/time'
import router from '../router'
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  const countres = await request({
    apiPath: '/getOnlineExamCount'
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getOnlineExamList',
    body: {
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  const currenttime = Date.now()
  data.value = res.data.map(item => {
    item.disabled = !(item.startTime <= currenttime && item.endTime >= currenttime)
    item.startTime = time(item.startTime)
    item.endTime = time(item.endTime)
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
function answer(info) {
  router.push('/answeronlineexam?info=' + encode(info))
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
            <div class="sp">
              <div class="bold-text">科目</div>
              <div>{{ item.subject }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">作答开始时间</div>
              <div>{{ item.startTime }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">作答结束时间</div>
              <div>{{ item.endTime }}</div>
            </div>
          </div>
          <div class="sp">
            <tiny-button type="success" @click="answer(item)" :disabled="item.disabled">作答</tiny-button>
          </div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>