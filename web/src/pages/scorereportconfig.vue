<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { readFile } from '../util/file'
import request from '../util/request'
import time from '../util/time'
const route = useRoute()
const info = route.query.info
const param = ref({})
if (info) {
  try {
    param.value = decode(info)
    document.title = '智能阅卷系统 - ' + param.value.backname + ' - 成绩报告配置'
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
  data.value = res.data.map(item => {
    return {
      ...item,
      updateTime: time(item.updateTime),
      updateTimeSeen: item.updateTime == -1 ? false : true,
      idArray: item.subject == '多学科' ? item.scorereportconfigIdArray.join('、') : ''
    }
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
async function generateScorereportconfig(id) {
  await request({
    apiPath: '/generateScorereport',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '操作成功',
    status: 'success'
  })
  get()
}
async function newScorereportconfig() {
  const content = await readFile()
  let info
  try {
    info = JSON.parse(content)
    info.id = param.value.examId
  } catch {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
  }
  if (param.value.subject == '多学科' && info.subject != '多学科') {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
    return
  }
  if (info) {
    await request({
      apiPath: '/newScorereportconfig',
      body: info
    })
    TinyModal.message({
      message: '新增成功',
      status: 'success'
    })
    get()
  }
}
async function updateStudentVisible(id) {
  await request({
    apiPath: '/updateScorereportconfigStudentVisible',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '操作成功',
    status: 'success'
  })
  get()
}
async function updateScorereportconfig(id) {
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
  if (param.value.subject == '多学科' && info.subject != '多学科') {
    TinyModal.message({
      message: '文件内容非法',
      status: 'warning'
    })
    return
  }
  if (info) {
    await request({
      apiPath: '/updateScorereportconfig',
      body: info
    })
    TinyModal.message({
      message: '修改成功',
      status: 'success'
    })
    get()
  }
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
const dialog = ref(false)
const dialoginfo = ref({})
function openDialog(info) {
  dialoginfo.value = JSON.parse(JSON.stringify(info))
  dialoginfo.value.jointVisibleAccount = dialoginfo.value.jointVisibleAccount.join('、')
  dialoginfo.value.schoolVisibleAccount = dialoginfo.value.schoolVisibleAccount.join('、')
  dialoginfo.value.classVisibleAccount = dialoginfo.value.classVisibleAccount.join('、')
  if (dialoginfo.value.subject != '多学科') {
    dialoginfo.value.config.scoringQuestionNames = dialoginfo.value.config.scoringQuestionNames.join()
  }
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
  dialoginfo.value = {}
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: param.backpath }" :label="param.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/scorereportconfig' }" label="成绩报告配置"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <tiny-button type="success" @click="newScorereportconfig">选择配置文件新增</tiny-button>
      <tiny-button type="info" @click="get">刷新</tiny-button>
    </div>
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="sp">
              <div class="large-bold-text">{{ item.name }}</div>
              <tiny-tag v-if="item.type == 'system'" type="info" style="flex-shrink:0">系统</tiny-tag>
              <tiny-tag v-if="item.type == 'custom'" type="info" style="flex-shrink:0">自定义</tiny-tag>
            </div>
            <div class="sp">
              <div class="bold-text">科目</div>
              <div>{{ item.subject }}</div>
            </div>
            <div v-if="item.subject == '多学科'" class="sp">
              <div class="bold-text">合并成绩报告配置ID</div>
              <div>{{ item.idArray }}</div>
            </div>
            <div v-if="item.updateTimeSeen" class="sp">
              <div class="bold-text">最近生成时间</div>
              <div>{{ item.updateTime }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">ID</div>
              <div class="clickwz" @click="copy(item.scorereportconfigId)">{{ item.scorereportconfigId }}</div>
            </div>
            <tiny-checkbox v-model="item.studentVisible"
              @change="updateStudentVisible(item.scorereportconfigId)">学生可查看</tiny-checkbox>
          </div>
          <div v-if="item.status != 'processing'" class="sp">
            <tiny-button type="info" @click="openDialog(item)">详情</tiny-button>
            <tiny-button type="success" @click="generateScorereportconfig(item.scorereportconfigId)">生成</tiny-button>
            <tiny-button type="info" @click="updateScorereportconfig(item.scorereportconfigId)">选择配置文件修改</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteScorereportconfig(item.scorereportconfigId)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
          <div v-if="item.status == 'processing'"><tiny-tag type="warning">生成中</tiny-tag></div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
    <tiny-dialog-box class="dialog" :visible="dialog" title="详情" @close="closeDialog">
      <div class="cz">
        <div class="sp">
          <div class="bold-text">班级任课老师可见</div>
          <div v-if="dialoginfo.classTeacherVisible">是</div>
          <div v-if="!dialoginfo.classTeacherVisible">否</div>
        </div>
        <div v-if="dialoginfo.jointVisibleAccount" class="sp">
          <div class="bold-text">联考报告可见老师</div>
          <div>{{ dialoginfo.jointVisibleAccount }}</div>
        </div>
        <div v-if="dialoginfo.schoolVisibleAccount" class="sp">
          <div class="bold-text">学校报告可见老师</div>
          <div>{{ dialoginfo.schoolVisibleAccount }}</div>
        </div>
        <div v-if="dialoginfo.classVisibleAccount" class="sp">
          <div class="bold-text">班级报告可见老师</div>
          <div>{{ dialoginfo.classVisibleAccount }}</div>
        </div>
        <div v-if="dialoginfo.subject != '多学科'" class="sp">
          <div class="bold-text">分数（不含附）换算倍数</div>
          <div>{{ dialoginfo.config.scoreTimes }}</div>
        </div>
        <div v-if="dialoginfo.subject != '多学科'" class="sp">
          <div class="bold-text">计分题号</div>
          <div>{{ dialoginfo.config.scoringQuestionNames }}</div>
        </div>
        <div v-if="dialoginfo.subject != '多学科' && dialoginfo.config.fuScoreRule.length > 0" class="sp">
          <div class="bold-text">赋分规则</div>
          <tiny-grid :data="dialoginfo.config.fuScoreRule">
            <tiny-grid-column field="level" title="等级" align="center"></tiny-grid-column>
            <tiny-grid-column field="ratio" title="比例" align="center"></tiny-grid-column>
            <tiny-grid-column field="max" title="最高分数" align="center"></tiny-grid-column>
            <tiny-grid-column field="min" title="最低分数" align="center"></tiny-grid-column>
          </tiny-grid>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeDialog">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>