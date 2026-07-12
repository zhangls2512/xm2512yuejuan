<script setup>
document.title = '智能阅卷系统 - 阅卷任务 - 已结束'
import { ref } from 'vue'
import { encode } from '../util/code'
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
  TinyModal.message({
    message: '获取数据成功',
    status: 'success'
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
</script>

<template>
  <div class="cz">
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="sp">
          <div class="large-bold-text">{{ item.examName }}</div>
          <tiny-tag type="info">{{ item.examType }}</tiny-tag>
        </div>
        <div>时间：{{ item.examTime }}</div>
        <div>科目：{{ item.subject }}</div>
        <div class="line"></div>
        <div class="cz">
          <div v-if="item.adminmarkgroupname != ''" class="cz">
            <div class="spacebetween">
              <div>题组长【{{ item.adminmarkgroupname }}】</div>
              <tiny-button type="info" :disabled="item.markStatus == 'paused'">管理</tiny-button>
            </div>
            <div class="line"></div>
          </div>
          <div v-if="item.admin == true" class="cz">
            <div class="spacebetween">
              <div>科组长</div>
              <tiny-button type="info">管理</tiny-button>
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