<script setup>
document.title = '智能阅卷系统 - 考试管理 - 成绩报告配置'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
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
  TinyModal.message({
    message: '获取数据成功',
    status: 'success'
  })
  data.value = res.data
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
function updateScorereportconfig(info) {
  router.push('/updatescorereportconfig?info=' + encode(info))
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
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div v-if="item.type == 'system'" class="sp">
            <div class="large-bold-text">系统默认</div>
            <tiny-tag type="info">系统</tiny-tag>
          </div>
          <div v-if="item.type == 'custom'" class="sp">
            <div class="large-bold-text">{{ item.name }}</div>
            <tiny-tag type="info">自定义</tiny-tag>
          </div>
          <div class="sp">
            <tiny-button type="info" @click="updateScorereportconfig(item)">修改</tiny-button>
            <tiny-popconfirm v-if="item.type == 'custom'" title="提示" message="删除成功后无法恢复，确定删除？" type="warning"
              trigger="hover" @confirm="deleteScorereportconfig(item.scorereportconfigId)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>