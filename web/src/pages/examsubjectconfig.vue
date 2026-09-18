<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import time from '../util/time'
const route = useRoute()
const info = route.query.info
const data = ref({})
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 科目配置'
    if (data.value.subject.answerOnline) {
      data.value.subject.startTime = time(data.value.subject.startTime)
      data.value.subject.endTime = time(data.value.subject.endTime)
    }
  } catch {
  }
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/examsubjectinfo' }" label="科目配置"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.exam.name }}</div>
      <tiny-tag type="info" style="flex-shrink:0">{{ data.exam.type }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.exam.time }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">作答方式</div>
      <div v-if="data.subject.answerOnline">在线</div>
      <div v-if="!data.subject.answerOnline">扫描</div>
    </div>
    <div v-if="data.subject.answerOnline" class="sp">
      <div class="bold-text">作答开始时间</div>
      <div>{{ data.subject.startTime }}</div>
    </div>
    <div v-if="data.subject.answerOnline" class="sp">
      <div class="bold-text">作答结束时间</div>
      <div>{{ data.subject.endTime }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">班级</div>
      <div class="cz">
        <div v-for="item in data.subject.class">{{ item }}</div>
      </div>
    </div>
    <div class="sp">
      <div class="bold-text">管理员</div>
      <tiny-grid :data="data.subject.admin" style="flex:1">
        <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
        <tiny-grid-column field="permission" title="权限" align="center" show-overflow></tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="sp">
      <div class="bold-text">客观题</div>
      <div>{{ data.subject.objectiveQuestion }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">主观题</div>
      <div>{{ data.subject.subjectiveQuestion }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">阅卷组</div>
      <div>{{ data.subject.markGroup }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">分卷</div>
      <div>{{ data.subject.volume }}</div>
    </div>
  </div>
</template>