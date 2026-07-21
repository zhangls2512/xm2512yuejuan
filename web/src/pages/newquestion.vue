<script setup>
document.title = '智能阅卷系统 - 题目管理 - 新增题目'
import { ref } from 'vue'
import { readImage } from '../util/file'
import request from '../util/request'
import router from '../router'
const question = ref('')
const answer = ref('')
const type = ref('')
const difficulty = ref('0')
const subject = ref('')
const grade = ref('')
const knowledgepointwz = ref('')
const knowledgepoint = ref([])
async function selectQuestion() {
  const content = await readImage()
  question.value = content
}
async function selectAnswer() {
  const content = await readImage()
  answer.value = content
}
function add() {
  if (!knowledgepointwz.value) {
    TinyModal.message({
      message: '请输入知识点名称',
      status: 'warning'
    })
    return
  }
  if (knowledgepoint.value.includes(knowledgepointwz.value)) {
    TinyModal.message({
      message: '知识点名称已存在',
      status: 'warning'
    })
    return
  }
  knowledgepoint.value.push(knowledgepointwz.value)
  knowledgepointwz.value = ''
}
function remove(index) {
  knowledgepoint.value.splice(index, 1)
}
async function newQuestion() {
  if (!question.value) {
    TinyModal.message({
      message: '请选择题目',
      status: 'warning'
    })
    return
  }
  if (!answer.value) {
    TinyModal.message({
      message: '请选择答案',
      status: 'warning'
    })
    return
  }
  if (!type.value) {
    TinyModal.message({
      message: '请输入类型',
      status: 'warning'
    })
    return
  }
  if (!subject.value) {
    TinyModal.message({
      message: '请输入科目',
      status: 'warning'
    })
    return
  }
  if (knowledgepoint.value.length == 0) {
    TinyModal.message({
      message: '请新增知识点',
      status: 'warning'
    })
    return
  }
  const res = await request({
    apiPath: '/newQuestion',
    body: {
      question: question.value,
      answer: answer.value,
      type: type.value,
      difficulty: Number(difficulty.value),
      subject: subject.value,
      grade: grade.value,
      knowledgePoint: knowledgepoint.value
    }
  })
  TinyModal.message({
    message: '新增成功',
    status: 'success'
  })
  router.push('/question')
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/question' }" label="题目管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/newquestion' }" label="新增题目"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <tiny-form>
      <tiny-form-item label="题目">
        <div class="cz">
          <div><tiny-button type="info" @click="selectQuestion">选择图片</tiny-button></div>
          <img v-if="question != ''" :src="question"></img>
        </div>
      </tiny-form-item>
      <tiny-form-item label="答案">
        <div class="cz">
          <div><tiny-button type="info" @click="selectAnswer">选择图片</tiny-button></div>
          <img v-if="answer != ''" :src="answer"></img>
        </div>
      </tiny-form-item>
      <tiny-form-item label="类型">
        <tiny-input v-model="type" clearable placeholder="请输入类型"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="难度">
        <tiny-numeric v-model="difficulty" min="0"></tiny-numeric>
      </tiny-form-item>
      <tiny-form-item label="科目">
        <tiny-input v-model="subject" clearable placeholder="请输入科目"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="年级">
        <tiny-input v-model="grade" clearable placeholder="请输入年级"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="知识点">
        <div class="cz">
          <div class="sp">
            <tiny-input v-model="knowledgepointwz" placeholder="请输入知识点名称"></tiny-input>
            <tiny-button type="success" @click="add">添加</tiny-button>
          </div>
          <div v-for="(item, index) in knowledgepoint" class="sp">
            <tiny-tag type="info">{{ item }}</tiny-tag>
            <tiny-button type="danger" @click="remove(index)">删除</tiny-button>
          </div>
        </div>
      </tiny-form-item>
      <tiny-form-item>
        <tiny-button type="success" @click="newQuestion">新增</tiny-button>
      </tiny-form-item>
    </tiny-form>
  </div>
</template>