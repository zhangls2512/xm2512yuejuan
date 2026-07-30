<script setup>
import { ref } from 'vue'
import request from '../util/request'
const aidialog = ref(false)
const question = ref('')
const history = ref([])
const disabled = ref(false)
function getuid() {
  let userid = ''
  const exist = localStorage.getItem('accountinfo')
  if (!exist) {
    const aiassistantuid = localStorage.getItem('aiassistantuid')
    if (!aiassistantuid) {
      const uuid = crypto.randomUUID()
      userid = uuid
      localStorage.setItem('aiassistantuid', uuid)
    } else {
      userid = aiassistantuid
    }
  }
  if (exist) {
    const accountinfo = JSON.parse(exist)
    userid = accountinfo.account
  }
  return userid
}
function openAiDialog() {
  aidialog.value = true
}
function closeAiDialog() {
  aidialog.value = false
  question.value = ''
  history.value = []
}
async function send() {
  if (!question.value) {
    TinyModal.message({
      message: '请输入问题',
      status: 'warning'
    })
    return
  }
  history.value.push({
    question: question.value,
    answer: ''
  })
  const tempquestion = question.value
  question.value = ''
  const res = await request({
    apiPath: '/getAiAssistantAnswer',
    body: {
      question: tempquestion,
      userId: getuid()
    }
  }, true)
  const answer = res.data
  let i = 0
  disabled.value = true
  const id = setInterval(() => {
    if (i < answer.length) {
      history.value[history.value.length - 1].answer += answer[i]
      i++
    } else {
      clearInterval(id)
      disabled.value = false
    }
  }, 30)
}
function clearHistory() {
  history.value = []
}
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png" loading="lazy"></img>
        <div class="header-title">智能阅卷系统</div>
      </div>
    </div>
    <router-view class="empty"></router-view>
    <div class="footer">
      <div class="footer-text">Version 1.1.8</div>
      <tiny-divider direction="vertical"></tiny-divider>
      <a class="footer-text" href="https://docs.qq.com/doc/p/cfe2a8b2b5709cadd6d9048aa4fd001678197397"
        target="_blank">帮助文档</a>
      <tiny-divider direction="vertical"></tiny-divider>
      <router-link class="footer-text" to="/updatelog" target="_blank">更新日志</router-link>
      <tiny-divider direction="vertical"></tiny-divider>
      <div class="sp">
        <img src="/ai.svg" loading="lazy" @click="openAiDialog"></img>
        <div class="clickwz" @click="openAiDialog">AI智能客服</div>
      </div>
    </div>
    <tiny-dialog-box :visible="aidialog" title="AI智能客服" right-slide @close="closeAiDialog">
      <template #title>
        <div class="large-bold-text">AI智能客服</div>
      </template>
      <div class="cz">
        <div class="aikuang" style="background-color:rgba(187,187,187,0.2)">欢迎使用轩铭2512智能阅卷系统智能客服，希望能为您提供满意的回答。</div>
        <div v-for="item in history" style="display:flex;flex-direction:column;gap:10px">
          <div class="aikuang" style="align-self:flex-end;background-color:#0DC2B333;text-align:right">{{ item.question
          }}
          </div>
          <div v-if="item.answer != ''" class="aikuang" style="background-color:rgba(187,187,187,0.2)">{{ item.answer }}
          </div>
          <div v-if="item.answer == ''" class="aikuang" style="background-color:rgba(187,187,187,0.2)">正在努力回答中，请耐心等待...
          </div>
        </div>
      </div>
      <template #footer>
        <div class="sp">
          <tiny-input v-model="question" minlength="1" maxlength="100" placeholder="请输入问题"></tiny-input>
          <tiny-button type="success" :disabled="disabled" @click="send">发送</tiny-button>
          <tiny-button type="danger" :disabled="disabled" @click="clearHistory">清除历史</tiny-button>
        </div>
      </template>
    </tiny-dialog-box>
  </div>
</template>

<style scoped>
.aikuang {
  border-radius: 20px;
  padding: 20px;
  max-width: 80%;
}
</style>