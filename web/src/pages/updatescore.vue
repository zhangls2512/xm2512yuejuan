<script setup>
document.title = '智能阅卷系统 - 考试管理 - 修改分数'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const studentaccount = ref('')
const answerimage = ref([])
const markloglist = ref([])
if (info) {
  try {
    data.value = decode(info)
  } catch {
  }
}
async function search() {
  if (studentaccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的学生账号',
      status: 'warning'
    })
    return
  }
  answerimage.value = []
  markloglist.value = []
  const res = await request({
    apiPath: '/getStudentMarklog',
    body: {
      id: data.value.examId,
      subject: data.value.subject,
      studentAccount: studentaccount.value
    }
  })
  answerimage.value = res.data.answerImage
  markloglist.value = res.data.marklog
}
async function submit(item) {
  if (studentaccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的学生账号',
      status: 'warning'
    })
    return
  }
  const body = {
    id: data.value.examId,
    subject: data.value.subject,
    studentAccount: studentaccount.value,
    questionName: item.questionName
  }
  if (item.answer) {
    body.answer = item.answer
  }
  if (item.stepScore) {
    body.stepScore = item.stepScore
  }
  await request({
    apiPath: '/updateScore',
    body: body
  })
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  search()
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingexam' }" label="考试管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/updatescore' }" label="修改分数"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject }}</div>
    </div>
    <div class="sp">
      <div>学生账号</div>
      <tiny-input v-model="studentaccount" clearable minlength="36" maxlength="36" placeholder="请输入学生账号"></tiny-input>
      <tiny-button type="info" @click="search">搜索</tiny-button>
    </div>
    <div style="color:red">修改提交成功后需手动操作生成成绩报告才可生效。</div>
    <div class="spacebetween">
      <div class="cz" style="width:50%;height:100%">
        <div v-for="item in answerimage" style="display:flex;justify-content:center">
          <tiny-image v-if="item != ''" :src="item" :preview-src-list="[item]"></tiny-image>
          <div v-if="item == ''" class="large-text" style="color:red">图片数据异常</div>
        </div>
      </div>
      <div v-if="markloglist.length > 0" class="cz" style="width:45%;height:100%">
        <div v-for="item, index in markloglist" class="cz">
          <div v-if="index > 0" class="line"></div>
          <div class="sp">
            <div class="bold-text">{{ item.questionName }}</div>
            <div class="cz">
              <tiny-checkbox-group v-if="item.option" v-model="item.answer">
                <tiny-checkbox v-for="(i, j) in item.option" :label="j">{{ i }}</tiny-checkbox>
              </tiny-checkbox-group>
              <div v-if="item.stepScoreRule && item.stepScoreRule.length == 1">
                <tiny-radio v-for="ii in item.stepScoreRule[0]" v-model="item.stepScore[0]" :label="ii">{{ ii
                }}</tiny-radio>
              </div>
              <div v-for="i, j in item.stepScoreRule" v-if="item.stepScoreRule && item.stepScoreRule.length > 1"
                class="sp">
                <div>步骤{{ j + 1 }}</div>
                <div>
                  <tiny-radio v-for="ii in i" v-model="item.stepScore[j]" :label="ii">{{ ii }}</tiny-radio>
                </div>
              </div>
              <div v-if="item.stepScoreRule" class="cz">
                <div class="bold-text">历史分数</div>
                <div v-for="h in item.history" class="sp">
                  <div>{{ h.type }}</div>
                  <div>{{ h.markerAccount }}</div>
                  <div>{{ h.totalScore }}分</div>
                </div>
              </div>
            </div>
            <tiny-button type="success" @click="submit(item)">提交</tiny-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>