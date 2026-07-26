<script setup>
document.title = '智能阅卷系统 - 成绩报告'
import { ref } from 'vue'
import { encode } from '../util/code'
import request from '../util/request'
import router from '../router'
const accountinfo = ref({})
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
const type = ref('joint')
const id = ref('')
const subject = ref('')
async function get() {
  if (accountinfo.value.type != 'student') {
    if (type.value == 'class' && id.value.length != 36) {
      TinyModal.message({
        message: '请输入有效的ID',
        status: 'warning'
      })
      return
    }
    if (type.value == 'school' && !accountinfo.value.schoolId && id.value.length != 36) {
      TinyModal.message({
        message: '请输入有效的ID',
        status: 'warning'
      })
      return
    }
    if (!subject.value) {
      TinyModal.message({
        message: '请输入科目',
        status: 'warning'
      })
      return
    }
  }
  const countres = await request({
    apiPath: '/getScorereportCount',
    body: {
      type: type.value,
      id: id.value,
      subject: subject.value
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getScorereportList',
    body: {
      type: type.value,
      id: id.value,
      subject: subject.value,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data.map(item => {
    const date = new Date(item.createTime)
    item.createTime = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    return item
  })
}
const exist = localStorage.getItem('accountinfo')
if (exist) {
  accountinfo.value = JSON.parse(exist)
  if (accountinfo.value.type == 'student') {
    get()
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
function info(info) {
  router.push('/scorereportinfo?info=' + encode(info))
}
</script>

<template>
  <div class="cz">
    <tiny-form v-if="accountinfo.type == 'teacher'">
      <tiny-form-item label="类型">
        <tiny-radio-group v-model="type">
          <tiny-radio label="joint">联考</tiny-radio>
          <tiny-radio label="school">学校</tiny-radio>
          <tiny-radio label="class">班级</tiny-radio>
        </tiny-radio-group>
      </tiny-form-item>
      <tiny-form-item v-if="type == 'class' || (type == 'school' && accountinfo.schoolId == '')" label="ID">
        <tiny-input v-model="id" clearable minlength="36" maxlength="36" placeholder="请输入ID"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="科目">
        <tiny-input v-model="subject" clearable placeholder="请输入科目"></tiny-input>
      </tiny-form-item>
      <tiny-form-item>
        <tiny-button type="info" @click="get">搜索</tiny-button>
      </tiny-form-item>
    </tiny-form>
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="large-bold-text">{{ item.scorereportconfigName }}</div>
            <div class="sp">
              <div class="bold-text">考试</div>
              <div>{{ item.examName }}</div>
              <tiny-tag type="info">{{ item.examType }}</tiny-tag>
            </div>
            <div class="sp">
              <div class="bold-text">科目</div>
              <div>{{ item.subject }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">时间</div>
              <div>{{ item.createTime }}</div>
            </div>
          </div>
          <div><tiny-button type="info" @click="info(item)">查看</tiny-button></div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>