<script setup>
document.title = '智能阅卷系统 - 在线考试 - 作答记录'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { readImage } from '../util/file'
import request from '../util/request'
import router from '../router'
const data = ref({})
const question = ref({
  objectiveQuestion: [],
  subjectiveQuestionGroup: [],
  optionalQuestion: []
})
const answer = ref({
  objectiveQuestion: [],
  subjectiveQuestionGroup: [],
  optionalQuestion: []
})
async function get() {
  const route = useRoute()
  const info = route.query.info
  if (info) {
    try {
      data.value = decode(info)
      const res = await request({
        apiPath: '/getOnlineExamQuestion',
        body: {
          id: data.value.examId,
          subject: data.value.subject
        }
      })
      question.value = res.data
      answer.value = {
        objectiveQuestion: question.value.objectiveQuestion.map(item => {
          return {
            name: item.name,
            answer: []
          }
        }),
        subjectiveQuestionGroup: question.value.subjectiveQuestionGroup.map(item => {
          return {
            name: item.name,
            answer: ''
          }
        }),
        optionalQuestion: Array.from({
          length: question.value.optionalQuestion.length
        }, () => [])
      }
    } catch {
    }
  }
}
get()
async function selectAnswer(index) {
  const content = await readImage()
  answer.value.subjectiveQuestionGroup[index].answer = content
}
async function submit() {
  for (let i = 0; i < answer.value.objectiveQuestion.length; i++) {
    if (answer.value.objectiveQuestion[i].answer.length == 0) {
      TinyModal.message({
        message: '客观题' + question.value.objectiveQuestion[i].name + '未作答',
        status: 'warning'
      })
      return
    }
  }
  for (let i = 0; i < answer.value.subjectiveQuestionGroup.length; i++) {
    if (!answer.value.subjectiveQuestionGroup[i].answer) {
      TinyModal.message({
        message: '主观题组' + question.value.subjectiveQuestionGroup[i].name + '未作答',
        status: 'warning'
      })
      return
    }
  }
  for (let i = 0; i < answer.value.optionalQuestion.length; i++) {
    if (answer.value.optionalQuestion[i].length != question.value.optionalQuestion[i].selectCount) {
      TinyModal.message({
        message: '请勾选选做题号',
        status: 'warning'
      })
      return
    }
  }
  TinyModal.confirm({
    status: 'info',
    title: '提示',
    message: '作答提交后，无法自行修改、撤回。确定提交？（提交成功后如需修改、撤回，请联系考试管理员删除作答记录）',
    events: {
      async confirm() {
        await request({
          apiPath: '/newAnswer',
          body: {
            id: data.value.examId,
            subject: data.value.subject,
            answer: answer.value
          }
        })
        TinyModal.message({
          message: '提交成功',
          status: 'success'
        })
        router.push('/onlineexam')
      }
    }
  })
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/onlineexam' }" label="在线考试"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/answeronlineexam' }" label="作答记录"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
    </div>
    <div>科目：{{ data.subject }}</div>
    <div>作答结束时间：{{ data.endTime }}</div>
    <div v-for="(item, index) in question.objectiveQuestion" class="kuang">
      <div class="sp">
        <div>{{ item.name }}</div>
        <div class="cz">
          <img v-if="item.question != ''" :src="item.question"></img>
          <tiny-tag v-if="item.extra == true" type="info">附加题</tiny-tag>
          <tiny-checkbox-group v-model="answer.objectiveQuestion[index].answer">
            <tiny-checkbox v-for="(i, j) in item.option" :label="j">{{ i }}</tiny-checkbox>
          </tiny-checkbox-group>
        </div>
      </div>
    </div>
    <div v-for="(item, index) in question.subjectiveQuestionGroup" class="kuang">
      <div class="cz">
        <div v-for="q in item.question" class="sp">
          <div>{{ q.name }}</div>
          <tiny-tag v-if="q.extra == true" type="info">附加题</tiny-tag>
          <img v-if="q.question != ''" :src="q.question"></img>
        </div>
        <tiny-button type="info" @click="selectAnswer(index)">选择图片</tiny-button>
        <img v-if="answer.subjectiveQuestionGroup[index].answer != ''"
          :src="answer.subjectiveQuestionGroup[index].answer"></img>
      </div>
    </div>
    <div v-if="question.optionalQuestion.length > 0" class="sp">
      <div class="bold-text">选做题号</div>
      <div v-for="(item, index) in question.optionalQuestion">
        <tiny-checkbox-group v-model="answer.optionalQuestion[index]" :max="item.selectCount">
          <tiny-checkbox v-for="i in item.name" :label="i">{{ i }}</tiny-checkbox>
        </tiny-checkbox-group>
      </div>
    </div>
    <div><tiny-button type="success" @click="submit">提交</tiny-button></div>
  </div>
</template>