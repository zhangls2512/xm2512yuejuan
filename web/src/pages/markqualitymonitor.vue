<script setup>
document.title = '智能阅卷系统 - 考试管理 - 阅卷质量监控'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
const route = useRoute()
const data = ref({})
const tabname = ref('分数一致性')
const markconsistency = ref([])
const info = route.query.info
if (info) {
  try {
    data.value = decode(info)
    getMarkConsistency()
  } catch {
  }
}
async function getMarkConsistency(row) {
  const res = await request({
    apiPath: '/getMarkConsistency',
    body: {
      id: data.value.examId,
      subject: data.value.subject
    }
  })
  markconsistency.value = res.data
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingexam' }" label="考试管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/markqualitymonitor' }" label="阅卷质量监控"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject }}</div>
    </div>
    <tiny-tabs v-model="tabname">
      <tiny-tab-item title="分数一致性" name="分数一致性">
        <template #default>
          <div class="cz">
            <div style="color:red">偏差率：平均分差占该题总分的百分比。</div>
            <div class="wide-sp">
              <div class="bold-text">阅卷人账号</div>
              <div class="bold-text">题号</div>
              <div class="bold-text">平均分差</div>
              <div class="bold-text">偏差率</div>
            </div>
            <div v-for="item in markconsistency" class="cz">
              <div class="line"></div>
              <div class="wide-sp">
                <div>{{ item.markerAccount }}</div>
                <div class="cz" v-for="i in item.questions">
                  <div class="wide-sp">
                    <div>{{ i.name }}</div>
                    <div>{{ i.averageScoreDiff }}</div>
                    <div>{{ i.diffPercent }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </tiny-tab-item>
      <tiny-tab-item title="阅卷记录抽样" name="阅卷记录抽样">
        <template #default>
          <div>敬请期待</div>
        </template>
      </tiny-tab-item>
    </tiny-tabs>
  </div>
</template>