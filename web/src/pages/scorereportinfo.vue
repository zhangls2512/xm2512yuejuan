<script setup>
document.title = '智能阅卷系统 - 成绩报告 - 成绩报告详情'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { TinyHuichartsHistogram as TinyChartHistogram } from '@opentiny/vue-huicharts'
import { decode } from '../util/code'
import request from '../util/request'
import answerimagecanvas from './answerimage.vue'
import answerlistgrid from './answerlist.vue'
import knowledgepointlistgrid from './knowledgepointlist.vue'
const route = useRoute()
const info = route.query.info
const accountinfo = ref({})
const data = ref({})
const tabledata = ref([])
const columns = ref([])
const tabname = ref('小题分析')
const tabnameb = ref('小题作答情况')
const exist = localStorage.getItem('accountinfo')
const fu = ref(false)
const qadialog = ref(false)
const qa = ref({})
const sadialog = ref(false)
const answer = ref({})
const aldialog = ref(false)
const answerlist = ref([])
const kpdialog = ref(false)
const knowledgepointlist = ref([])
const aadialog = ref(false)
const answerimage = ref({})
const chartdata = ref({})
const schoolmap = ref({})
const classmap = ref({})
const studentmap = ref({})
if (exist) {
  accountinfo.value = JSON.parse(exist)
}
if (info) {
  try {
    data.value = decode(info)
    if (accountinfo.value.type == 'teacher') {
      data.value.schoolarr.forEach(item => {
        schoolmap.value[item.id] = item.name
      })
      data.value.classarr.forEach(item => {
        classmap.value[item.id] = item.name
      })
      if (data.value.subject == '多学科') {
        tabledata.value = flatStudents(data.value.student)
        columns.value = buildColumns(data.value.student)
      }
      if (data.value.subject != '多学科' && data.value.student.length > 0 && data.value.student[0].fuScore != undefined) {
        fu.value = true
      }
      if (data.value.type == 'joint') {
        chartdata.value = {
          data: data.value.school.map(item => {
            return {
              schoolId: schoolmap.value[item.id],
              '平均分': item.averageScore,
              '标准差': item.scoreStandardDeviation,
              '原始区分度': item.discrimination
            }
          }),
          xAxis: 'schoolId'
        }
      }
      if (data.value.type == 'school') {
        chartdata.value = {
          data: data.value.class.map(item => {
            return {
              classId: classmap.value[item.id],
              '平均分': item.averageScore,
              '标准差': item.scoreStandardDeviation,
              '原始区分度': item.discrimination
            }
          }),
          xAxis: 'classId'
        }
      }
      getStudentMap()
    }
    if (accountinfo.value.type == 'student' && data.value.subject != '多学科') {
      getAnswerList()
      getKnowledgepointList()
    }
  } catch {
  }
}
async function getStudentMap() {
  const res = await request({
    apiPath: '/getScorereportStudentMap',
    body: {
      id: data.value.id
    }
  })
  studentmap.value = res.data
}
async function getAnswerList(stu = '') {
  const res = await request({
    apiPath: '/getStudentAnswerList',
    body: {
      id: data.value.id,
      studentAccount: stu
    }
  })
  answerlist.value = res.data
}
async function getKnowledgepointList(stu = '') {
  const res = await request({
    apiPath: '/getStudentKnowledgepointList',
    body: {
      id: data.value.id,
      studentAccount: stu
    }
  })
  knowledgepointlist.value = res.data
}
async function openQa(questionname) {
  const res = await request({
    apiPath: '/getQuestionAndAnswer',
    body: {
      id: data.value.id,
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
async function openAl(stu) {
  await getAnswerList(stu)
  aldialog.value = true
}
function closeAl() {
  aldialog.value = false
  answerlist.value = []
}
async function openKp(stu) {
  await getKnowledgepointList(stu)
  kpdialog.value = true
}
function closeKp() {
  kpdialog.value = false
  knowledgepointlist.value = []
}
async function openSa(questionname, stu) {
  const res = await request({
    apiPath: '/getStudentQuestionAnswer',
    body: {
      id: data.value.id,
      studentAccount: stu,
      questionName: questionname
    }
  })
  answer.value = res.data
  sadialog.value = true
}
async function openSab(row, type) {
  const res = await request({
    apiPath: '/getTypicalMarklog',
    body: {
      id: data.value.id,
      questionName: row.name,
      type: type
    }
  })
  answer.value = res.data
  sadialog.value = true
}
function closeSa() {
  sadialog.value = false
  answer.value = {}
}
async function openAa(stu) {
  const res = await request({
    apiPath: '/getStudentAnswerImage',
    body: {
      id: data.value.id,
      studentAccount: stu
    }
  })
  answerimage.value = res.data
  aadialog.value = true
}
function closeAa() {
  aadialog.value = false
  answerimage.value = {}
}
function flatStudents(students) {
  return students.map(stu => {
    const row = {
      account: stu.account
    }
    stu.subject.forEach(sub => {
      const prefix = sub.name
      Object.entries(sub).forEach(([k, v]) => {
        if (k != 'name') {
          row[prefix + '_' + k] = v
        }
      })
    })
    return row
  })
}
function buildColumns(students) {
  const subjects = new Set()
  const fields = new Set()
  students.forEach(stu => {
    stu.subject.forEach(sub => {
      subjects.add(sub.name)
      Object.keys(sub).forEach(k => {
        if (k != 'name') {
          fields.add(k)
        }
      })
    })
  })
  const titlemap = {
    totalScoreWithExtra: '分数（含附）',
    totalScoreWithoutExtra: '分数（不含附）',
    extraTotalScore: '附分',
    jointRank: '联次',
    schoolRank: '校次',
    classRank: '班次',
    fuScore: '赋分',
    level: '等级'
  }
  return [
    {
      type: 'index',
      title: '序号'
    },
    {
      field: 'account',
      title: '学生ID'
    },
    ...[...subjects].map(subject => ({
      title: subject,
      children: [...fields].map(field => ({
        field: subject + '_' + field,
        title: titlemap[field],
        sortable: true
      }))
    }))
  ]
}
function formatQuestionName(a) {
  return a.cellValue.join('、')
}
function formatScoringRate(a) {
  return a.cellValue + '%'
}
function formatSchoolId(a) {
  return schoolmap.value[a.cellValue]
}
function formatClassId(a) {
  return classmap.value[a.cellValue]
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/scorereport' }" label="成绩报告"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/scorereportinfo' }" label="成绩报告详情"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="large-bold-text">{{ data.name }}</div>
    <div class="sp">
      <div class="bold-text">考试</div>
      <div>{{ data.examName }}</div>
      <tiny-tag type="info">{{ data.examType }}</tiny-tag>
    </div>
    <div class="sp">
      <div class="bold-text">科目</div>
      <div>{{ data.subject }}</div>
    </div>
    <div v-if="accountinfo.type == 'teacher'" class="cz">
      <div class="sp">
        <div class="bold-text">平均分</div>
        <div>{{ data.averageScore }}</div>
      </div>
      <div class="sp">
        <div class="bold-text">标准差</div>
        <div>{{ data.scoreStandardDeviation }}</div>
      </div>
      <div class="sp">
        <div class="bold-text">原始区分度</div>
        <div>{{ data.discrimination }}</div>
      </div>
      <div v-if="data.type == 'joint'" class="cz">
        <div class="bold-text">各学校整体统计数据</div>
        <tiny-grid :data="data.school" border>
          <tiny-grid-column field="id" title="名称" :format-text="formatSchoolId" align="center"></tiny-grid-column>
          <tiny-grid-column field="averageScore" title="平均分" sortable align="center"></tiny-grid-column>
          <tiny-grid-column field="scoreStandardDeviation" title="标准差" sortable align="center"></tiny-grid-column>
          <tiny-grid-column field="discrimination" title="原始区分度" sortable align="center"></tiny-grid-column>
        </tiny-grid>
        <tiny-chart-histogram :options="chartdata"></tiny-chart-histogram>
      </div>
      <div v-if="data.type == 'school'" class="cz">
        <div class="bold-text">各班级整体统计数据</div>
        <tiny-grid :data="data.class" border>
          <tiny-grid-column field="id" title="名称" :format-text="formatClassId" align="center"></tiny-grid-column>
          <tiny-grid-column field="averageScore" title="平均分" sortable align="center"></tiny-grid-column>
          <tiny-grid-column field="scoreStandardDeviation" title="标准差" sortable align="center"></tiny-grid-column>
          <tiny-grid-column field="discrimination" title="原始区分度" sortable align="center"></tiny-grid-column>
        </tiny-grid>
        <tiny-chart-histogram :options="chartdata"></tiny-chart-histogram>
      </div>
      <tiny-tabs v-model="tabname">
        <tiny-tab-item v-if="data.subject != '多学科'" title="小题分析" name="小题分析">
          <template #default>
            <tiny-grid :data="data.question" border>
              <tiny-grid-column field="name" title="题号" align="center">
                <template #default="{ row }">
                  <div class="clickwz" @click="openQa(row.name)">{{ row.name }}</div>
                </template>
              </tiny-grid-column>
              <tiny-grid-column field="averageScore" title="平均分" sortable align="center"></tiny-grid-column>
              <tiny-grid-column field="scoringRate" title="得分率" :format-text="formatScoringRate" sortable
                align="center"></tiny-grid-column>
              <tiny-grid-column field="scoreStandardDeviation" title="标准差" sortable align="center"></tiny-grid-column>
              <tiny-grid-column field="discrimination" title="标准区分度" sortable align="center"></tiny-grid-column>
              <tiny-grid-column title="作答详情" align="center">
                <template #default="{ row }">
                  <div v-if="row.option" class="cz">
                    <div v-for="item, index in row.optionName" class="sp">
                      <div class="bold-text">{{ item }}</div>
                      <div class="cz">
                        <div v-for="i in row.option[index]">{{ studentmap[i] }}</div>
                      </div>
                      <div>（{{ row.option[index].length }}人）</div>
                    </div>
                    <div class="sp">
                      <div class="bold-text">正确答案</div>
                      <div>{{ row.answer }}</div>
                    </div>
                  </div>
                  <div v-if="row.score" class="cz">
                    <div v-for="item in row.score" class="sp">
                      <div class="bold-text">{{ item.score }}</div>
                      <div class="cz">
                        <div v-for="i in item.student" class="clickwz" @click="openSa(row.name, i)">{{ studentmap[i] }}
                        </div>
                      </div>
                      <div>（{{ item.student.length }}人）</div>
                    </div>
                    <div class="sp">
                      <div class="bold-text" style="color:red;cursor:pointer" @click="openSab(row, 'excellent')">优秀作答
                      </div>
                      <div class="bold-text" style="color:brown;cursor:pointer" @click="openSab(row, 'typicalMistake')">
                        典型错误</div>
                    </div>
                  </div>
                </template>
              </tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-tab-item>
        <tiny-tab-item v-if="data.subject != '多学科'" title="知识点分析" name="知识点分析">
          <template #default>
            <tiny-grid :data="data.knowledgepoint" border>
              <tiny-grid-column field="name" title="知识点名称" align="center"></tiny-grid-column>
              <tiny-grid-column field="questionName" title="题号" :format-text="formatQuestionName" sortable
                align="center"></tiny-grid-column>
              <tiny-grid-column field="scoringRate" title="得分率" :format-text="formatScoringRate" sortable
                align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-tab-item>
        <tiny-tab-item title="成绩单" name="成绩单">
          <template #default>
            <tiny-grid v-if="data.subject == '多学科'" :data="tabledata" :columns="columns" align="center"
              border></tiny-grid>
            <tiny-grid v-if="data.subject != '多学科'" :data="data.student" border>
              <tiny-grid-column type="index" title="序号" align="center"></tiny-grid-column>
              <tiny-grid-column title="姓名" align="center">
                <template #default="{ row }">
                  <tiny-dropdown :show-icon="false">
                    <template #default>
                      <div class="clickwz">{{ studentmap[row.account] }}</div>
                    </template>
                    <template #dropdown>
                      <tiny-dropdown-menu placement="bottom-start">
                        <tiny-dropdown-item @click="openAa(row.account)">查看原卷</tiny-dropdown-item>
                        <tiny-dropdown-item @click="openAl(row.account)">查看小题作答情况</tiny-dropdown-item>
                        <tiny-dropdown-item @click="openKp(row.account)">查看知识点掌握情况</tiny-dropdown-item>
                      </tiny-dropdown-menu>
                    </template>
                  </tiny-dropdown>
                </template>
              </tiny-grid-column>
              <tiny-grid-column field="totalScoreWithExtra" title="分数（含附）" sortable align="center"></tiny-grid-column>
              <tiny-grid-column field="totalScoreWithoutExtra" title="分数（不含附）" sortable
                align="center"></tiny-grid-column>
              <tiny-grid-column field="extraTotalScore" title="附分" sortable align="center"></tiny-grid-column>
              <tiny-grid-column v-if="fu == true" field="fuScore" title="赋分" sortable align="center"></tiny-grid-column>
              <tiny-grid-column v-if="fu == true" field="level" title="等级" sortable align="center"></tiny-grid-column>
              <tiny-grid-column field="jointRank" title="联次" sortable align="center"></tiny-grid-column>
              <tiny-grid-column v-if="data.type != 'joint'" field="schoolRank" title="校次" sortable
                align="center"></tiny-grid-column>
              <tiny-grid-column v-if="data.type == 'class'" field="classRank" title="班次" sortable
                align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-tab-item>
      </tiny-tabs>
    </div>
    <div v-if="accountinfo.type == 'student'">
      <div v-if="data.subject != '多学科'" class="cz">
        <div class="sp">
          <div class="bold-text">分数（含附加题）</div>
          <div>{{ data.info.totalScoreWithExtra }}</div>
        </div>
        <div class="sp">
          <div class="bold-text">分数（不含附加题）</div>
          <div>{{ data.info.totalScoreWithoutExtra }}</div>
        </div>
        <div class="sp">
          <div class="bold-text">附加题分数</div>
          <div>{{ data.info.extraTotalScore }}</div>
        </div>
        <div v-if="data.info.fuScore != undefined" class="sp">
          <div class="bold-text">赋分</div>
          <div>{{ data.info.fuScore }}</div>
        </div>
        <div v-if="data.info.level != undefined" class="sp">
          <div class="bold-text">赋分等级</div>
          <div>{{ data.info.level }}</div>
        </div>
        <div><tiny-button type="info" @click="openAa">查看原卷</tiny-button></div>
        <tiny-tabs v-if="data.subject != '多学科'" v-model="tabnameb">
          <tiny-tab-item title="小题作答情况" name="小题作答情况">
            <template #default>
              <answerlistgrid :data="answerlist" :id="data.id" :click="true">
              </answerlistgrid>
            </template>
          </tiny-tab-item>
          <tiny-tab-item title="知识点掌握情况" name="知识点掌握情况">
            <template #default>
              <knowledgepointlistgrid :data="knowledgepointlist"></knowledgepointlistgrid>
            </template>
          </tiny-tab-item>
        </tiny-tabs>
      </div>
      <tiny-grid v-if="data.subject == '多学科'" :data="data.info.subject" border>
        <tiny-grid-column field="name" title="科目" align="center"></tiny-grid-column>
        <tiny-grid-column field="totalScoreWithExtra" title="分数（含附）" sortable align="center"></tiny-grid-column>
        <tiny-grid-column field="totalScoreWithoutExtra" title="分数（不含附）" sortable align="center"></tiny-grid-column>
        <tiny-grid-column field="extraTotalScore" title="附分" sortable align="center"></tiny-grid-column>
        <tiny-grid-column field="fuScore" title="赋分" sortable align="center"></tiny-grid-column>
        <tiny-grid-column field="level" title="等级" sortable align="center"></tiny-grid-column>
      </tiny-grid>
    </div>
    <tiny-dialog-box class="dialog" :visible="qadialog" title="题目" @close="closeQa">
      <div class="sp">
        <div class="bold-text">题目</div>
        <tiny-image v-if="qa.question != ''" :src="qa.question" :preview-src-list="[qa.question]"
          style="flex:1;min-width:0"></tiny-image>
        <img v-if="qa.question == ''" src="/noimage.png" style="flex:1;min-width:0" loading="lazy"></img>
      </div>
      <div class="sp">
        <div class="bold-text">答案</div>
        <tiny-image v-if="qa.answer != ''" :src="qa.answer" :preview-src-list="[qa.answer]"
          style="flex:1;min-width:0"></tiny-image>
        <img v-if="qa.answer == ''" src="/noimage.png" style="flex:1;min-width:0" loading="lazy"></img>
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
    <tiny-dialog-box class="dialog" :visible="sadialog" title="作答" @close="closeSa">
      <div class="cz">
        <div class="large-text" style="color:red">总分：{{ answer.totalScore }}</div>
        <div v-for="item, index in answer.stepScore" v-if="answer.stepScore.length > 1" style="color:red">步骤{{ index + 1
        }}：{{ item }}分</div>
        <div v-for="item in answer.answerImage">
          <img v-if="item != ''" :src="item" loading="lazy"></img>
          <img v-if="item == ''" src="/noimage.png" loading="lazy"></img>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeSa">确定</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box class="dialog" :visible="aadialog" title="原卷" @close="closeAa">
      <div v-if="answerimage.answerOnline == false">
        <div class="cz">
          <img v-if="answerimage.image.length == 0" src="/noimage.png" loading="lazy"></img>
          <div v-for="image in answerimage.image">
            <answerimage :data="image"></answerimage>
          </div>
        </div>
      </div>
      <div v-if="answerimage.answerOnline == true">
        <div class="cz">
          <img v-if="answerimage.image.length == 0" src="/noimage.png" loading="lazy"></img>
          <div v-for="image in answerimage.image" class="sp">
            <div class="bold-text">{{ image.questionName }}</div>
            <answerimagecanvas :data="image"></answerimagecanvas>
          </div>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeAa">确定</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box class="dialog" :visible="aldialog" title="小题作答情况" @close="closeAl">
      <answerlistgrid :data="answerlist" :id="data.id" :click="false">
      </answerlistgrid>
      <template #footer>
        <tiny-button type="info" @click="closeAl">确定</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box class="dialog" :visible="kpdialog" title="知识点掌握情况" @close="closeKp">
      <knowledgepointlistgrid :data="knowledgepointlist"></knowledgepointlistgrid>
      <template #footer>
        <tiny-button type="info" @click="closeKp">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>