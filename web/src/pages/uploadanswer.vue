<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { readImageDirectory } from '../util/file'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const volumes = ref([])
const volume = ref('')
const answerimage = ref([])
const imgref = ref([])
const canvasref = ref([])
const origincoord = ref([])
const optionalquestions = ref([])
const optionalquestion = ref([])
const studentaccount = ref('')
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 上传作答'
    volumes.value = data.value.subject.volume.map(item => item.name)
    volume.value = data.value.subject.volume[0].name
  } catch {
  }
}
function setImgRef(element, index) {
  imgref.value[index] = element
}
function setCanvasRef(element, index) {
  canvasref.value[index] = element
}
async function chooseimage() {
  clear()
  const volumeitem = data.value.subject.volume.find(item => item.name == volume.value)
  answerimage.value = await readImageDirectory(volumeitem.page.length)
  origincoord.value = Array.from({ length: volumeitem.page.length }, () => [0, 0])
  optionalquestions.value = volumeitem.optionalQuestion
  optionalquestion.value = Array.from({ length: volumeitem.optionalQuestion.length }, () => [])
}
async function preview() {
  for (let i = 0; i < answerimage.value.length; i++) {
    const item = answerimage.value[i]
    if (!item) {
      TinyModal.message({
        message: '第' + (i + 1) + '页图片数据异常',
        status: 'warning'
      })
      return
    }
  }
  const volumeitem = data.value.subject.volume.find(item => item.name == volume.value)
  for (let i = 0; i < volumeitem.page.length; i++) {
    const coords = volumeitem.page[i].map(item => item.coord).flat()
    const img = imgref.value[i]
    const canvas = canvasref.value[i]
    canvas.width = img.clientWidth
    canvas.height = img.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const scaleX = img.clientWidth / img.naturalWidth
    const scaleY = img.clientHeight / img.naturalHeight
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 1
    coords.forEach(([x1, y1, x2, y2]) => {
      ctx.strokeRect((x1 + origincoord.value[i][0]) * scaleX, (y1 + origincoord.value[i][1]) * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY)
    })
  }
}
async function upload() {
  for (let i = 0; i < answerimage.value.length; i++) {
    const item = answerimage.value[i]
    if (!item) {
      TinyModal.message({
        message: '第' + (i + 1) + '页图片数据异常',
        status: 'warning'
      })
      return
    }
  }
  if (studentaccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的学生账号',
      status: 'warning'
    })
    return
  }
  await request({
    apiPath: '/newAnswer',
    body: {
      id: data.value.exam.examId,
      subject: data.value.subject.name,
      studentAccount: studentaccount.value,
      answer: {
        volume: volume.value,
        page: answerimage.value.map((item, index) => {
          return {
            image: item,
            originCoord: origincoord.value[index]
          }
        }),
        optionalQuestion: optionalquestion.value
      }
    }
  })
  TinyModal.message({
    message: '上传成功',
    status: 'success'
  })
  clear()
}
function clear() {
  answerimage.value = []
  imgref.value = []
  canvasref.value = []
  origincoord.value = []
  optionalquestions.value = []
  optionalquestion.value = []
  studentaccount.value = ''
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/uploadanswer' }" label="上传作答"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.exam.name }}</div>
      <tiny-tag type="info" style="flex-shrink:0">{{ data.exam.type }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.exam.time }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
    </div>
    <div class="spacebetween" style="align-items:flex-start">
      <div class="cz" style="flex:1">
        <div v-for="item, index in answerimage" style="display:flex;justify-content:center;position:relative">
          <img v-if="item" :ref="element => setImgRef(element, index)" :src="item" style="flex:1;min-width:0"></img>
          <canvas v-if="item" :ref="element => setCanvasRef(element, index)"
            style="position:absolute;inset:0;pointer-events:none"></canvas>
          <div v-if="!item" class="large-text" style="color:red">图片数据异常</div>
        </div>
      </div>
      <div class="cz" style="flex:1">
        <div><tiny-button type="info" @click="chooseimage">选择图片文件夹</tiny-button></div>
        <div class="sp">
          <div class="bold-text">分卷</div>
          <tiny-radio-group v-model="volume" @change="clear">
            <tiny-radio v-for="item in volumes" :label="item">{{ item }}</tiny-radio>
          </tiny-radio-group>
        </div>
        <div v-if="answerimage.length > 0" class="sp">
          <div class="bold-text">原点</div>
          <div class="cz">
            <div v-for="item, index in origincoord" class="sp">
              <div>{{ index + 1 }}</div>
              <div>（</div>
              <tiny-numeric v-model="item[0]" step-strictly :min="0"></tiny-numeric>
              <div>，</div>
              <tiny-numeric v-model="item[1]" step-strictly :min="0"></tiny-numeric>
              <div>）</div>
            </div>
          </div>
        </div>
        <div v-if="answerimage.length > 0 && optionalquestions.length > 0" class="sp">
          <div class="bold-text">选做题号</div>
          <div class="cz">
            <div v-for="item, index in optionalquestions">
              <tiny-checkbox-group v-model="optionalquestion[index]" :max="item.selectCount">
                <tiny-checkbox v-for="i in item.name" :label="i">{{ i }}</tiny-checkbox>
              </tiny-checkbox-group>
            </div>
          </div>
        </div>
        <div v-if="answerimage.length > 0" class="sp">
          <div class="bold-text">学生账号</div>
          <tiny-input v-model="studentaccount" clearable minlength="36" maxlength="36"
            placeholder="请输入学生账号"></tiny-input>
        </div>
        <div v-if="answerimage.length > 0" class="sp">
          <tiny-button type="info" @click="preview">预览</tiny-button>
          <div><tiny-button type="success" @click="upload">上传</tiny-button></div>
        </div>
      </div>
    </div>
  </div>
</template>