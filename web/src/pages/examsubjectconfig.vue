<script setup>
document.title = '智能阅卷系统 - 考试管理 - 科目配置'
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
    if (data.value.answerOnline) {
      data.value.startTime = time(data.value.startTime)
      data.value.endTime = time(data.value.endTime)
    }
  } catch {
  }
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingexam' }" label="考试管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/examsubjectinfo' }" label="科目配置"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="bold-text">名称</div>
      <div>{{ data.name }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">作答方式</div>
      <div v-if="data.answerOnline == true">在线</div>
      <div v-if="data.answerOnline == false">扫描</div>
    </div>
    <div v-if="data.answerOnline == true" class="sp">
      <div class="bold-text">作答开始时间</div>
      <div>{{ data.startTime }}</div>
    </div>
    <div v-if="data.answerOnline == true" class="sp">
      <div class="bold-text">作答结束时间</div>
      <div>{{ data.endTime }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">班级</div>
      <div class="cz" style="flex:1">
        <div v-for="item in data.class">{{ item }}</div>
      </div>
    </div>
    <div class="sp">
      <div class="bold-text">管理员</div>
      <tiny-grid :data="data.admin" style="flex:1">
        <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
        <tiny-grid-column field="permission" title="权限" align="center" show-overflow></tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="sp">
      <div class="bold-text">客观题</div>
      <div>{{ data.objectiveQuestion }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">主观题</div>
      <div>{{ data.subjectiveQuestion }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">阅卷组</div>
      <div>{{ data.markGroup }}</div>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">分卷</div>
      <div>{{ data.volume }}</div>
    </div>
  </div>
</template>