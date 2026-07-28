<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const markprogress = ref('')
const markerprogress = ref([])
const dialog = ref(false)
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 阅卷进度'
    get()
  } catch {
  }
}
async function get() {
  markprogress.value = ''
  const res = await request({
    apiPath: '/getMarkProgress',
    body: {
      id: data.value.examId,
      subject: data.value.subject
    }
  })
  markprogress.value = res.data
}
async function open(name) {
  const res = await request({
    apiPath: '/getQuestionMarkerMarkProgress',
    body: {
      id: data.value.examId,
      subject: data.value.subject,
      questionName: name
    }
  })
  markerprogress.value = res.data
  dialog.value = true
}
function close() {
  dialog.value = false
  markerprogress.value = []
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/markprogress' }" label="阅卷进度"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject }}</div>
    </div>
    <div><tiny-button type="info" @click="get">刷新</tiny-button></div>
    <div v-if="markprogress != '' && markprogress.progress !== false" class="sp">
      <div class="bold-text">整体</div>
      <tiny-progress style="width:50%" stroke-width="12" :percentage="markprogress.progress"></tiny-progress>
      <div>{{ markprogress.finished }}/{{ markprogress.total }}</div>
    </div>
    <div v-if="markprogress != ''" class="bold-text">小题</div>
    <div v-for="item, index in markprogress.list" v-if="markprogress != ''" class="cz">
      <div v-if="index > 0" class="line"></div>
      <div class="sp">
        <div v-if="item.questionName == '客观题'">客观题</div>
        <div v-if="item.questionName != '客观题'" class="clickwz" @click="open(item.questionName)">
          {{ item.questionName }}</div>
        <tiny-progress style="width:50%" stroke-width="12" :percentage="item.progress"></tiny-progress>
        <div>{{ item.finished }}/{{ item.total }}</div>
        <div class="cz" style="flex:1">
          <div v-for="i in item.detail" class="sp">
            <div class="bold-text">{{ i.name }}</div>
            <div>{{ i.count }}</div>
          </div>
        </div>
      </div>
    </div>
    <tiny-dialog-box class="dialog" :visible="dialog" title="各阅卷人已阅量" @close="close">
      <div class="cz">
        <div style="color:red">仅合并统计一评、二评、三评、仲裁已阅量，问题卷、修改/补录量不纳入统计。</div>
        <tiny-grid :data="markerprogress" border>
          <tiny-grid-column field="account" title="阅卷人账号" align="center"></tiny-grid-column>
          <tiny-grid-column field="count" title="已阅量" align="center"></tiny-grid-column>
        </tiny-grid>
      </div>
      <template #footer>
        <tiny-button type="info" @click="close">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>