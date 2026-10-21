<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { TinyHuichartsLine as TinyChartLine } from '@opentiny/vue-huicharts'
import { decode } from '../util/code'
import request from '../util/request'
const route = useRoute()
const data = ref({})
const tabname = ref('分数曲线')
const questionname = ref('')
const questionnamearr = ref([])
const markeraccount = ref('')
const markcurve = ref({})
const markconsistency = ref([])
const markarbitraterate = ref([])
const answer = ref({})
const objectivequestioncheckdata = ref({})
const objectivequestionchecktabname = ref('未选')
const objectivequestionmap = {}
const dialog = ref(false)
const answerimage = ref([])
const info = route.query.info
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 阅卷质量监控'
    questionnamearr.value = data.value.subject.subjectiveQuestion.map(item => item.name)
    data.value.subject.objectiveQuestion.forEach(item => {
      objectivequestionmap[item.name] = item
    })
  } catch {
  }
}
async function getMarkCurve() {
  if (!questionname.value) {
    TinyModal.message({
      message: '请选择题号',
      status: 'warning'
    })
    return
  }
  if (markeraccount.value && markeraccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的阅卷人账号',
      status: 'warning'
    })
    return
  }
  markcurve.value = {}
  const res = await request({
    apiPath: '/getMarkCurve',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      questionName: questionname.value,
      markerAccount: markeraccount.value
    }
  })
  markcurve.value = {
    data: res.data.map(item => {
      return {
        finalTotalScore: item.finalTotalScore,
        '数量': item.count
      }
    }),
    legend: {
      show: false
    },
    xAxis: {
      data: 'finalTotalScore',
      name: '分数'
    },
    yAxis: {
      name: '数量',
      interval: 1
    }
  }
}
async function getMarkConsistency() {
  const res = await request({
    apiPath: '/getMarkConsistency',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name
    }
  })
  markconsistency.value = res.data
}
async function getMarkArbitrateRate() {
  const res = await request({
    apiPath: '/getMarkArbitrateRate',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name
    }
  })
  markarbitraterate.value = res.data
}
async function get() {
  if (!questionname.value) {
    TinyModal.message({
      message: '请选择题号',
      status: 'warning'
    })
    return
  }
  if (markeraccount.value && markeraccount.value.length != 36) {
    TinyModal.message({
      message: '请输入有效的阅卷人账号',
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
      questionName: questionname.value,
      markerAccount: markeraccount.value
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
async function clearMarklog() {
  if (!questionname.value) {
    TinyModal.message({
      message: '请选择题号',
      status: 'warning'
    })
    return
  }
  TinyModal.confirm({
    status: 'error',
    title: '高危操作警告',
    message: '将清空一评、二评、三评、仲裁、问题卷阅卷记录，清空成功后无法恢复，确定清空？',
    events: {
      async confirm() {
        await request({
          apiPath: '/clearMarklog',
          body: {
            id: data.value.examId,
            subject: data.value.subject.name,
            questionName: questionname.value
          }
        })
        TinyModal.message({
          message: '清空成功',
          status: 'success'
        })
      }
    }
  })
}
async function checkObjectiveQuestionMarklog() {
  const res = await request({
    apiPath: '/checkObjectiveQuestionMarklog',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name
    }
  })
  objectivequestioncheckdata.value = res.data
}
async function openDialog(stu) {
  await getAnswerInfo(stu)
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
  answerimage.value = []
}
async function getAnswerInfo(id) {
  const res = await request({
    apiPath: '/getAnswerInfo',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      studentAccount: id
    }
  })
  answerimage.value = res.data
}
async function submit(item) {
  await request({
    apiPath: '/updateScore',
    body: {
      id: data.value.examId,
      subject: data.value.subject.name,
      studentAccount: item.studentAccount,
      questionName: item.questionName,
      answer: item.answer
    }
  })
  TinyModal.message({
    message: '提交成功',
    status: 'success'
  })
  checkObjectiveQuestionMarklog()
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/markqualitymonitor' }" label="阅卷质量监控"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.examName }}</div>
      <tiny-tag type="info" style="flex-shrink:0">{{ data.examType }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.examTime }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
    </div>
    <tiny-tabs v-model="tabname">
      <tiny-tab-item title="分数曲线" name="分数曲线">
        <template #default>
          <div class="cz">
            <div class="sp">
              <div class="bold-text">题号</div>
              <tiny-base-select v-model="questionname" style="width:150px">
                <tiny-option v-for="item in questionnamearr" :value="item"></tiny-option>
              </tiny-base-select>
              <tiny-input v-model="markeraccount" clearable maxlength="36" placeholder="请输入阅卷人账号"></tiny-input>
              <tiny-button type="info" @click="getMarkCurve">获取</tiny-button>
            </div>
            <tiny-chart-line :options="markcurve"></tiny-chart-line>
          </div>
        </template>
      </tiny-tab-item>
      <tiny-tab-item title="分数一致性" name="分数一致性">
        <template #default>
          <div class="cz">
            <div><tiny-button type="info" @click="getMarkConsistency">获取</tiny-button></div>
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
                <div class="cz">
                  <div v-for="i in item.questions" class="sp">
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
      <tiny-tab-item title="仲裁率" name="仲裁率">
        <template #default>
          <div class="cz">
            <div><tiny-button type="info" @click="getMarkArbitrateRate">获取</tiny-button></div>
            <div class="wide-sp">
              <div class="bold-text">题号</div>
              <div class="bold-text">阅卷人账号</div>
              <div class="bold-text">仲裁率</div>
            </div>
            <div v-for="item in markarbitraterate" class="cz">
              <div class="line"></div>
              <div class="wide-sp">
                <div>{{ item.questionName }}</div>
                <div class="cz">
                  <div v-for="i in item.list" class="sp">
                    <div>{{ i.account }}</div>
                    <div>{{ i.rate }}%</div>
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
              <tiny-input v-model="markeraccount" clearable maxlength="36" placeholder="请输入阅卷人账号"></tiny-input>
              <tiny-button type="info" @click="get">抽取</tiny-button>
            </div>
            <div class="spacebetween" style="align-items:flex-start">
              <div class="cz" style="flex:1">
                <div v-for="item in answer.answerImage" style="display:flex;justify-content:center">
                  <tiny-image v-if="item" :src="item" :preview-src-list="[item]"></tiny-image>
                  <div v-if="!item" class="large-text" style="color:red">图片数据异常</div>
                </div>
              </div>
              <div v-if="answer.stepScore" class="cz" style="flex:1">
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
      <tiny-tab-item title="阅卷记录清空" name="阅卷记录清空">
        <template #default>
          <div class="sp">
            <div class="bold-text">题号</div>
            <tiny-base-select v-model="questionname" style="width:150px">
              <tiny-option v-for="item in questionnamearr" :value="item"></tiny-option>
            </tiny-base-select>
            <tiny-button type="danger" @click="clearMarklog">清空</tiny-button>
          </div>
        </template>
      </tiny-tab-item>
      <tiny-tab-item title="客观题核查" name="客观题核查">
        <template #default>
          <div class="cz">
            <div><tiny-button type="info" @click="checkObjectiveQuestionMarklog">核查</tiny-button></div>
            <tiny-tabs v-model="objectivequestionchecktabname">
              <tiny-tab-item v-if="objectivequestioncheckdata" title="未选" name="未选">
                <template #default>
                  <div class="cz">
                    <div class="wide-sp">
                      <div class="bold-text">题号</div>
                      <div class="bold-text">学生账号</div>
                      <div class="bold-text">操作</div>
                    </div>
                    <div v-for="item in objectivequestioncheckdata.empty" class="cz">
                      <div class="line"></div>
                      <div class="wide-sp">
                        <div>{{ item.questionName }}</div>
                        <div>{{ item.studentAccount }}</div>
                        <div class="sp">
                          <tiny-checkbox-group v-model="item.answer">
                            <tiny-checkbox v-for="i, j in objectivequestionmap[item.questionName].option" :label="j">{{
                              i }}</tiny-checkbox>
                          </tiny-checkbox-group>
                          <tiny-button type="success" @click="submit(item)">提交</tiny-button>
                          <tiny-button v-if="!data.subject.answerOnline" type="info"
                            @click="openDialog(item.studentAccount)">查看原卷</tiny-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </tiny-tab-item>
              <tiny-tab-item v-if="objectivequestioncheckdata" title="单选题多选" name="单选题多选">
                <template #default>
                  <div class="cz">
                    <div class="wide-sp">
                      <div class="bold-text">题号</div>
                      <div class="bold-text">学生账号</div>
                      <div class="bold-text">作答</div>
                      <div class="bold-text">操作</div>
                    </div>
                    <div v-for="item in objectivequestioncheckdata.multiple" class="cz">
                      <div class="line"></div>
                      <div class="wide-sp">
                        <div>{{ item.questionName }}</div>
                        <div>{{ item.studentAccount }}</div>
                        <div>{{item.answer.map(index => objectivequestionmap[item.questionName].option[index]).join('')
                        }}</div>
                        <div class="sp">
                          <tiny-checkbox-group v-model="item.answer">
                            <tiny-checkbox v-for="i, j in objectivequestionmap[item.questionName].option" :label="j">{{
                              i }}</tiny-checkbox>
                          </tiny-checkbox-group>
                          <tiny-button type="success" @click="submit(item)">提交</tiny-button>
                          <tiny-button v-if="!data.subject.answerOnline" type="info"
                            @click="openDialog(item.studentAccount)">查看原卷</tiny-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </tiny-tab-item>
            </tiny-tabs>
          </div>
        </template>
      </tiny-tab-item>
    </tiny-tabs>
    <tiny-dialog-box class="dialog" :visible="dialog" title="作答" @close="closeDialog">
      <div class="cz">
        <div v-for="item in answerimage">
          <img v-if="item" :src="item"></img>
          <img v-if="!item" src="/noimage.png"></img>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeDialog">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>