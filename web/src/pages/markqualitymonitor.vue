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
const questionname = ref('')
const questionnamearr = ref([])
const answer = ref({})
const info = route.query.info
if (info) {
  try {
    data.value = decode(info)
    questionnamearr.value = data.value.subject.subjectiveQuestion.map(item => item.name)
    getMarkConsistency()
  } catch {
  }
}
async function getMarkConsistency(row) {
  const res = await request({
    apiPath: '/getMarkConsistency',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name
    }
  })
  markconsistency.value = res.data
}
async function get() {
  if (!questionname.value) {
    TinyModal.message({
      message: '请选择题号',
      status: 'warning'
    })
    return
  }
  answer.value = {}
  const res = await request({
    apiPath: '/spotMarklog',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      questionName: questionname.value
    }
  })
  answer.value = res.data
}
async function newQuestion() {
  await request({
    apiPath: '/newQuestionMarklog',
    body: {
      id: answer.value.marklogId,
      reason: '阅卷记录抽样'
    }
  })
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  get()
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
      <div>{{ data.subject.name }}</div>
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
          <div class="cz">
            <div class="sp">
              <div class="bold-text">题号</div>
              <tiny-base-select v-model="questionname" style="width:150px">
                <tiny-option v-for="item in questionnamearr" :value="item"></tiny-option>
              </tiny-base-select>
              <tiny-button type="info" @click="get">抽取</tiny-button>
            </div>
            <div class="spacebetween">
              <div class="cz" style="width:50%;height:100%">
                <div v-for="item in answer.answerImage" style="display:flex;justify-content:center">
                  <tiny-image v-if="item != ''" :src="item" :preview-src-list="[item]"></tiny-image>
                  <div v-if="item == ''" class="large-text" style="color:red">图片数据异常</div>
                </div>
              </div>
              <div v-if="answer.stepScore" class="cz" style="width:45%;height:100%">
                <div class="sp">
                  <div class="bold-text">总分</div>
                  <div>{{ answer.totalScore }}</div>
                </div>
                <div class="bold-text">步骤分</div>
                <div v-for="item, index in answer.stepScore">步骤{{ index + 1 }}：{{ item }}分</div>
                <tiny-button type="warning" @click="newQuestion">提交问题卷</tiny-button>
                <div v-if="answer.history.length > 0" class="bold-text">历史分数</div>
                <div v-for="h in answer.history" class="sp">
                  <div>{{ h.type }}</div>
                  <div>{{ h.markerAccount }}</div>
                  <div>{{ h.totalScore }}分</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </tiny-tab-item>
    </tiny-tabs>
  </div>
</template>