<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const markprogress = ref('')
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
        <div>{{ item.questionName }}</div>
        <tiny-progress style="width:50%" stroke-width="12" :percentage="item.progress"></tiny-progress>
        <div>{{ item.finished }}/{{ item.total }}</div>
        <div class="cz" style="flex:1">
          <div v-for="i in item.detail">{{ i.name }}：{{ i.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>