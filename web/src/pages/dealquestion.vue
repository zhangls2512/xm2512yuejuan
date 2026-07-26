<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { getTransparentImage, getImageSize, readImage } from '../util/file'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const fullscreen = ref(false)
const answerimage = ref([])
const traceimage = ref([])
const markloglist = ref([])
const marklist = ref([])
const questionreason = ref('')
const questionnewaccount = ref('')
const studentaccount = ref('')
const questionmarklog = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
async function get() {
  answerimage.value = []
  traceimage.value = []
  markloglist.value = []
  marklist.value = []
  questionreason.value = ''
  questionnewaccount.value = ''
  studentaccount.value = ''
  const count = await request({
    apiPath: '/getQuestionMarklogCount',
    body: {
      id: data.value.examId,
      subject: data.value.subject
    }
  })
  total.value = count.count
  const res = await request({
    apiPath: '/getQuestionMarklogList',
    body: {
      id: data.value.examId,
      subject: data.value.subject,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  questionmarklog.value = res.data
}
async function currentpageChange(t) {
  currentpage.value = t
  get()
}
async function pagesizeChange(t) {
  pagesize.value = t
  get()
}
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 处理问题卷'
    get()
  } catch {
  }
}
async function enterfullscreen() {
  await document.documentElement.requestFullscreen()
  fullscreen.value = true
}
async function exitfullscreen() {
  await document.exitFullscreen()
  fullscreen.value = false
}
async function selectTraceimage(index) {
  const content = await readImage()
  const size = await getImageSize(content)
  if (size.width != traceimage.value[index].width || size.height != traceimage.value[index].height) {
    TinyModal.message({
      message: '选图宽高与原图不符。原图：' + traceimage.value[index].width + '*' + traceimage.value[index].height + '；选图：' + size.width + '*' + size.height,
      status: 'warning'
    })
    return
  }
  traceimage.value[index].data = content
}
async function deleteTraceimage(index) {
  traceimage.value[index].data = traceimage.value[index].transparent
}
async function submit() {
  for (let i = 0; i < marklist.value.length; i++) {
    const markitem = marklist.value[i]
    await request({
      apiPath: '/submitQuestionMarklog',
      body: {
        id: markloglist.value[i].id,
        stepScore: markitem.stepScore,
        traceImage: traceimage.value.map(item => item.data),
        excellent: markitem.excellent,
        typicalMistake: markitem.typicalMistake
      }
    })
  }
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  get()
}
async function mark(id) {
  answerimage.value = []
  traceimage.value = []
  markloglist.value = []
  marklist.value = []
  const res = await request({
    apiPath: '/getQuestionMarklogInfo',
    body: {
      id: id
    }
  })
  answerimage.value = res.data.answerImage
  markloglist.value = res.data.marklogList
  marklist.value = res.data.marklogList.map(item => {
    return {
      stepScore: item.markStepScore,
      excellent: item.excellent,
      typicalMistake: item.typicalMistake
    }
  })
  questionreason.value = res.data.questionReason
  questionnewaccount.value = res.data.questionNewAccount
  studentaccount.value = res.data.studentAccount
  if (res.data.traceImage.length == 0) {
    for (let i = 0; i < answerimage.value.length; i++) {
      const item = answerimage.value[i]
      if (!item) {
        traceimage.value.push({
          data: '',
          transparent: '',
          width: 0,
          height: 0
        })
      }
      if (item) {
        const size = await getImageSize(item)
        const transparent = await getTransparentImage(size.width, size.height)
        traceimage.value.push({
          data: transparent,
          transparent: transparent,
          width: size.width,
          height: size.height
        })
      }
    }
  }
  if (res.data.traceImage.length > 0) {
    for (let i = 0; i < res.data.traceImage.length; i++) {
      const item = res.data.traceImage[i]
      if (!item) {
        traceimage.value.push({
          data: '',
          transparent: '',
          width: 0,
          height: 0
        })
      }
      if (item) {
        const size = await getImageSize(item)
        const transparent = await getTransparentImage(size.width, size.height)
        traceimage.value.push({
          data: item,
          transparent: transparent,
          width: size.width,
          height: size.height
        })
      }
    }
  }
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/dealquestion' }" label="处理问题卷"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="spacebetween">
      <div class="cz" style="width:50%;height:100%">
        <div class="spacebetween">
          <div class="sp">
            <div class="large-bold-text">{{ data.examName }}</div>
            <tiny-tag type="info">{{ data.examType }}</tiny-tag>
            <div class="bold-text">时间</div>
            <div>{{ data.examTime }}</div>
            <div class="bold-text">科目</div>
            <div>{{ data.subject }}</div>
          </div>
          <div class="sp">
            <div v-if="fullscreen == false" class="clickwz" @click="enterfullscreen">全屏阅卷</div>
            <div v-if="fullscreen == true" class="clickwz" @click="exitfullscreen">退出全屏</div>
          </div>
        </div>
        <div v-for="item, index in answerimage" style="display:flex;justify-content:center">
          <div v-if="item != ''" class="sp">
            <div style="position:relative">
              <tiny-image :src="item" :preview-src-list="[item]"></tiny-image>
              <img :src="traceimage[index].data" style="position:absolute;inset:0;pointer-events:none"></img>
            </div>
            <div class="sp">
              <tiny-button type="info" @click="selectTraceimage(index)">设置留痕</tiny-button>
              <tiny-button type="danger" @click="deleteTraceimage(index)">删除留痕</tiny-button>
            </div>
          </div>
          <div v-if="item == ''" class="large-text" style="color:red">图片数据异常</div>
        </div>
      </div>
      <div class="sp" style="width:45%;height:100%">
        <div v-if="markloglist.length > 0" class="cz" style="height:100%">
          <div v-for="item, index in markloglist" class="cz">
            <div class="bold-text">{{ item.questionName }}</div>
            <div v-if="item.stepScore.length == 1">
              <tiny-radio v-for="ii in item.stepScore[0]" v-model="marklist[index].stepScore[0]" :label="ii">{{ ii
              }}</tiny-radio>
            </div>
            <div v-for="i, j in item.stepScore" v-if="item.stepScore.length > 1" class="sp">
              <div>步骤{{ j + 1 }}</div>
              <div>
                <tiny-radio v-for="ii in i" v-model="marklist[index].stepScore[j]" :label="ii">{{ ii }}</tiny-radio>
              </div>
            </div>
            <div class="sp">
              <div>优秀</div>
              <tiny-switch v-model="marklist[index].excellent"></tiny-switch>
            </div>
            <div class="sp">
              <div>错误</div>
              <tiny-switch v-model="marklist[index].typicalMistake"></tiny-switch>
            </div>
          </div>
          <tiny-button type="success" @click="submit">提交</tiny-button>
          <div v-if="questionreason != ''" class="sp">
            <div class="bold-text">原因</div>
            <div>{{ questionreason }}</div>
          </div>
          <div v-if="questionnewaccount != ''" class="sp">
            <div class="bold-text">提交者</div>
            <div>{{ questionnewaccount }}</div>
          </div>
          <div v-if="studentaccount != ''" class="sp">
            <div class="bold-text">学生</div>
            <div style="flex:1">{{ studentaccount }}</div>
          </div>
        </div>
        <div class="cz" style="height:100%">
          <div class="sp">
            <div class="large-bold-text">列表</div>
            <tiny-button type="info" @click="get">刷新</tiny-button>
          </div>
          <tiny-grid :data="questionmarklog">
            <tiny-grid-column field="questionName" title="题号" align="center"></tiny-grid-column>
            <tiny-grid-column field="marked" title="处理" align="center" format-text="boole"></tiny-grid-column>
            <tiny-grid-column title="操作" align="center">
              <template #default="{ row }">
                <tiny-button type="info" @click="mark(row.id)">处理</tiny-button>
              </template>
            </tiny-grid-column>
          </tiny-grid>
          <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
            :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
        </div>
      </div>
    </div>
  </div>
</template>