<script setup>
document.title = '智能阅卷系统 - 阅卷任务 - 阅卷'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import { getTransparentImage, getImageSize, readImage } from '../util/file'
import request from '../util/request'
const route = useRoute()
const info = route.query.info
const data = ref({})
const type = ref('')
const markgroupnamearr = ref('')
const markgroupname = ref('')
const markgroupfinished = ref(0)
const markgroupquota = ref(0)
const fullscreen = ref(false)
const answerimage = ref([])
const traceimage = ref([])
const markloglist = ref([])
const marklist = ref([])
const consistencycheck = ref(false)
const scorehistory = ref('')
const historymarklog = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const huiping = ref(false)
const dialog = ref(false)
const reason = ref('')
async function getHistoryMarklog() {
  const res = await request({
    apiPath: '/getHistoryMarklogList',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      name: markgroupname.value,
      type: type.value,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  historymarklog.value = res.data
}
async function currentpageChange(t) {
  currentpage.value = t
  getHistoryMarklog()
}
async function pagesizeChange(t) {
  pagesize.value = t
  getHistoryMarklog()
}
if (info) {
  try {
    const res = decode(info)
    data.value = res.info
    type.value = res.type
    if (res.type == 'normal') {
      markgroupnamearr.value = data.value.normalMarkGroupName
    }
    if (res.type == 'arbitrate') {
      markgroupnamearr.value = data.value.arbitrateMarkGroupName
    }
    markgroupname.value = markgroupnamearr.value[0]
    get()
    getHistoryMarklog()
  } catch {
  }
}
async function get() {
  huiping.value = false
  answerimage.value = []
  traceimage.value = []
  markloglist.value = []
  marklist.value = []
  consistencycheck.value = false
  scorehistory.value = ''
  const finished = await request({
    apiPath: '/getHistoryMarklogCount',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      name: markgroupname.value,
      type: type.value
    }
  })
  markgroupfinished.value = finished.count
  const quota = await request({
    apiPath: '/getMarkTaskQuota',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      name: markgroupname.value,
      type: type.value
    }
  })
  markgroupquota.value = quota.quota
  const res = await request({
    apiPath: '/getMarkTask',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      name: markgroupname.value,
      type: type.value
    }
  })
  answerimage.value = res.data.answerImage
  markloglist.value = res.data.marklogList
  marklist.value = res.data.marklogList.map(item => {
    return {
      stepScore: item.stepScore.map(i => i[i.length - 1]),
      excellent: false,
      typicalMistake: false,
      doubtful: false
    }
  })
  if (!res.data.consistencyCheck) {
    consistencycheck.value = false
  }
  if (res.data.consistencyCheck) {
    consistencycheck.value = true
  }
  if (res.data.scoreHistory) {
    scorehistory.value = res.data.scoreHistory
  }
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
function changeselect() {
  get()
  getHistoryMarklog()
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
      apiPath: '/submitMarkTask',
      body: {
        id: markloglist.value[i].id,
        stepScore: markitem.stepScore,
        traceImage: traceimage.value.map(item => item.data),
        excellent: markitem.excellent,
        typicalMistake: markitem.typicalMistake,
        doubtful: markitem.doubtful,
        consistencyCheck: consistencycheck.value
      }
    })
  }
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  get()
  getHistoryMarklog()
}
function openDialog() {
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
  reason.value = ''
}
async function newQuestion() {
  if (!reason.value) {
    TinyModal.message({
      message: '请输入原因',
      status: 'warning'
    })
    return
  }
  for (let i = 0; i < marklist.value.length; i++) {
    const markitem = marklist.value[i]
    await request({
      apiPath: '/newQuestionMarklog',
      body: {
        id: markloglist.value[i].id,
        reason: reason.value
      }
    })
  }
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  closeDialog()
  get()
}
async function mark(id) {
  huiping.value = true
  answerimage.value = []
  traceimage.value = []
  markloglist.value = []
  marklist.value = []
  consistencycheck.value = false
  scorehistory.value = ''
  const res = await request({
    apiPath: '/getHistoryMarklogInfo',
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
      typicalMistake: item.typicalMistake,
      doubtful: item.doubtful
    }
  })
  if (res.data.scoreHistory) {
    scorehistory.value = res.data.scoreHistory
  }
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
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/processingmarktask' }" label="阅卷任务"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/mark' }" label="阅卷"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
      <div class="bold-text">阅卷类型</div>
      <div v-if="type == 'normal'">正常</div>
      <div v-if="type == 'arbitrate'">仲裁</div>
    </div>
    <div class="spacebetween">
      <div class="cz" style="width:50%;height:100%">
        <div class="spacebetween">
          <div class="sp">
            <div class="bold-text">题组</div>
            <tiny-base-select v-model="markgroupname" @change="changeselect" style="width:150px">
              <tiny-option v-for="item in markgroupnamearr" :value="item"></tiny-option>
            </tiny-base-select>
            <div class="bold-text">已阅量/任务量</div>
            <div>{{ markgroupfinished }}/{{ markgroupquota }}</div>
          </div>
          <div class="sp">
            <div v-if="huiping == true" class="clickwz" @click="get">继续阅卷</div>
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
          <div v-if="item == ''" class="large-text" style="color:red">图片数据异常，可提交问题卷</div>
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
            <div class="sp">
              <div>存疑</div>
              <tiny-switch v-model="marklist[index].doubtful"></tiny-switch>
            </div>
          </div>
          <div class="sp">
            <tiny-button type="success" @click="submit">提交</tiny-button>
            <tiny-button type="warning" @click="openDialog">提交问题卷</tiny-button>
          </div>
          <div v-if="type == 'arbitrate' && scorehistory != ''" class="cz">
            <div class="bold-text">历史分数</div>
            <div class="sp">
              <div class="bold-text">一评</div>
              <div class="cz" style="flex:1">
                <div v-for="item, index in scorehistory.first">步骤{{ index + 1 }}：{{ item }}</div>
              </div>
            </div>
            <div class="sp">
              <div class="bold-text">二评</div>
              <div class="cz" style="flex:1">
                <div v-for="item, index in scorehistory.second">步骤{{ index + 1 }}：{{ item }}</div>
              </div>
            </div>
            <div v-if="scorehistory.third.length > 0" class="sp">
              <div class="bold-text">三评</div>
              <div class="cz" style="flex:1">
                <div v-for="item, index in scorehistory.third">步骤{{ index + 1 }}：{{ item }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="cz" style="height:100%">
          <div class="sp">
            <div class="large-bold-text">阅卷记录</div>
            <tiny-button type="info" @click="getHistoryMarklog">刷新</tiny-button>
          </div>
          <tiny-grid :data="historymarklog">
            <tiny-grid-column field="questionName" title="题号" align="center"></tiny-grid-column>
            <tiny-grid-column field="totalScore" title="分数" align="center"></tiny-grid-column>
            <tiny-grid-column field="doubtful" title="存疑" align="center" format-text="boole"></tiny-grid-column>
            <tiny-grid-column title="操作" align="center">
              <template #default="{ row }">
                <tiny-button type="info" @click="mark(row.id)">回评</tiny-button>
              </template>
            </tiny-grid-column>
          </tiny-grid>
          <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
            :total="markgroupfinished" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
        </div>
      </div>
    </div>
    <tiny-dialog-box class="dialog" :visible="dialog" title="原因" @close="closeDialog">
      <tiny-input v-model="reason" clearable placeholder="请输入原因"></tiny-input>
      <template #footer>
        <tiny-button type="info" @click="newQuestion">提交</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>