<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { readFile, saveFile } from '../util/file'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 成绩补录'
  } catch {
  }
}
async function upload() {
  const content = await readFile('csv')
  await request({
    apiPath: '/supplyExamSubjectScore',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      csv: content
    }
  })
  TinyModal.message({
    message: '操作成功。后台正在补录，请耐心等待',
    status: 'success'
  })
}
function generateExampleCsv(subjectconfig) {
  const questions = subjectconfig.objectiveQuestion.concat(subjectconfig.subjectiveQuestion)
  const header = ['学生账号', '分卷名称'].concat(questions.map(q => q.name))
  const volume = subjectconfig.volume[0]
  let allquestionnames = []
  volume.page.forEach(page => {
    page.forEach(q => {
      if (q.objectiveQuestionName) {
        allquestionnames.push(q.objectiveQuestionName)
      }
      if (q.markGroupName) {
        const group = subjectconfig.markGroup.find(m => m.name == q.markGroupName)
        if (group) {
          allquestionnames = allquestionnames.concat(group.questionName)
        }
      }
    })
  })
  let selectquestionnames = []
  volume.optionalQuestion.forEach(item => {
    selectquestionnames = selectquestionnames.concat(item.name)
  })
  let answerquestionnames = allquestionnames.filter(q => !selectquestionnames.includes(q))
  volume.optionalQuestion.forEach(item => {
    answerquestionnames = answerquestionnames.concat(item.name.slice(0, item.selectCount))
  })
  const row = ['xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', volume.name]
  questions.forEach(q => {
    if (!answerquestionnames.includes(q.name)) {
      row.push('')
    } else {
      if (q.option) {
        row.push(q.option[0])
      } else {
        row.push(q.stepScore.map(s => s[0]).join(';'))
      }
    }
  })
  return header.join(',') + '\r\n' + row.join(',')
}
function download() {
  const examplecsv = generateExampleCsv(data.value.subject)
  saveFile(examplecsv, data.value.examName + '（' + data.value.subject.name + '）成绩补录模板.csv')
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/supplyscore' }" label="成绩补录"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
    </div>
    <div class="sp">
      <tiny-button type="success" @click="upload">上传CSV文件</tiny-button>
      <tiny-button type="info" @click="download">下载CSV文件模板</tiny-button>
    </div>
    <div class="bold-text">注意事项</div>
    <div>1.不要修改第一行。</div>
    <div>2.学生账号不能重复。</div>
    <div>3.客观题选项、主观题步骤分先后顺序要与配置一致。</div>
    <div>4.主观题各步骤分以;隔开。</div>
    <div>5.每行不能缺列，未作答题留空即可。</div>
    <div>6.上传成功后系统会在后台持续补录，请耐心等待。补录进度可在作答记录页面查看。</div>
    <div>7.如果未补录成功，可能因为学生不在考试所属学校内或已存在作答记录。</div>
    <div>8.后台补录期间请不要进行新增作答、删除作答、结束阅卷、生成成绩报告等需要写作答记录、读阅卷记录的操作，防止数据错乱。</div>
    <div>9.后台补录完成后需手动操作生成成绩报告才可生效。</div>
  </div>
</template>