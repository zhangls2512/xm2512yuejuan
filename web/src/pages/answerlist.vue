<script setup>
import { ref } from 'vue'
import request from '../util/request'
const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  scorereportId: {
    type: String,
    required: true
  },
  questionNameClick: {
    type: Boolean,
    required: true
  }
})
const qadialog = ref(false)
const qa = ref({})
async function openQa(questionname) {
  const res = await request({
    apiPath: '/getQuestionAndAnswer',
    body: {
      id: props.scorereportId,
      questionName: questionname
    }
  })
  qa.value = res.data
  qadialog.value = true
}
function closeQa() {
  qadialog.value = false
  qa.value = {}
}
</script>

<template>
  <tiny-grid :data="data" border>
    <tiny-grid-column field="questionName" title="题号" align="center">
      <template #default="{ row }">
        <div v-if="questionNameClick == true" class="clickwz" @click="openQa(row.questionName)">{{ row.questionName }}
        </div>
        <div v-if="questionNameClick == false">{{ row.questionName }}</div>
      </template>
    </tiny-grid-column>
    <tiny-grid-column title="作答" align="center">
      <template #default="{ row }">
        <div v-if="row.correctAnswer != ''">{{ row.answer }}</div>
        <div v-if="row.correctAnswer == ''" class="clickwz" @click="openSa(row.questionName, '')">查看</div>
      </template>
    </tiny-grid-column>
    <tiny-grid-column title="答案" align="center">
      <template #default="{ row }">
        <div v-if="row.correctAnswer != ''">{{ row.correctAnswer }}</div>
        <div v-if="row.correctAnswer == ''" class="clickwz" @click="openQa(row.questionName)">查看</div>
      </template>
    </tiny-grid-column>
    <tiny-grid-column field="score" title="得分" align="center"></tiny-grid-column>
    <tiny-grid-column field="totalScore" title="总分" align="center"></tiny-grid-column>
  </tiny-grid>
  <tiny-dialog-box class="dialog" :visible="qadialog" title="题目" @close="closeQa">
    <div class="sp">
      <div class="bold-text">题目</div>
      <tiny-image v-if="qa.question != ''" :src="qa.question" :preview-src-list="[qa.question]"
        style="flex:1;min-width:0"></tiny-image>
      <img v-if="qa.question == ''" src="/noimage.png" style="flex:1;min-width:0"></img>
    </div>
    <div class="sp">
      <div class="bold-text">答案</div>
      <tiny-image v-if="qa.answer != ''" :src="qa.answer" :preview-src-list="[qa.answer]"
        style="flex:1;min-width:0"></tiny-image>
      <img v-if="qa.answer == ''" src="/noimage.png" style="flex:1;min-width:0"></img>
    </div>
    <div class="sp">
      <div class="bold-text">难度</div>
      <div>{{ qa.difficulty }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">知识点</div>
      <tiny-tag v-for="item in qa.knowledgepoint" type="info">{{ item }}</tiny-tag>
    </div>
    <template #footer>
      <tiny-button type="info" @click="closeQa">确定</tiny-button>
    </template>
  </tiny-dialog-box>
</template>