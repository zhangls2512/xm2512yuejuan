<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
import router from '../router'
const param = ref({})
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  const countres = await request({
    apiPath: '/getAnswerCount',
    body: {
      id: param.value.examId,
      subject: param.value.subject
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getAnswerList',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data
}
const route = useRoute()
const info = route.query.info
if (info) {
  try {
    param.value = decode(info)
    document.title = '智能阅卷系统 - ' + param.value.backname + ' - 作答记录'
    get()
  } catch {
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
async function deleteAnswer(id) {
  await request({
    apiPath: '/deleteAnswer',
    body: {
      id: param.value.examId,
      subject: param.value.subject,
      studentAccount: id
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
      <tiny-breadcrumb-item :to="{ path: param.backpath }" :label="param.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/examsubjectanswer' }" label="作答记录"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <tiny-grid :data="data">
      <tiny-grid-column field="studentAccount" title="学生账号" align="center"></tiny-grid-column>
      <tiny-grid-column title="操作" align="center">
        <template #default="{ row }">
          <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
            @confirm="deleteAnswer(row.studentAccount)">
            <template #reference>
              <tiny-button type="danger">删除</tiny-button>
            </template>
          </tiny-popconfirm>
        </template>
      </tiny-grid-column>
    </tiny-grid>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>