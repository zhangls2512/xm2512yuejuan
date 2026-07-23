<script setup>
document.title = '智能阅卷系统 - 成绩报告 - 报告详情'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import request from '../util/request'
import AnswerImageCanvas from './answerimage.vue'
const route = useRoute()
const info = route.query.info
const accountinfo = ref({})
const data = ref({})
const tabledata = ref([])
const columns = ref([])
const tabname = ref('成绩单')
const exist = localStorage.getItem('accountinfo')
const fu = ref(false)
const qadialog = ref(false)
const qimage = ref('')
const aimage = ref('')
const sadialog = ref(false)
const saimage = ref([])
const answerlist = ref([])
const aadialog = ref(false)
const answerimage = ref({})
if (exist) {
  accountinfo.value = JSON.parse(exist)
}
if (info) {
  try {
    data.value = decode(info)
    if (accountinfo.value.type == 'teacher') {
      if (data.value.subject == '多学科') {
        tabledata.value = flatStudents(data.value.student)
        columns.value = buildColumns(data.value.student)
      }
      if (data.value.subject != '多学科' && data.value.student.length > 0 && data.value.student[0].fuScore != undefined) {
        fu.value = true
      }
    }
    if (accountinfo.value.type == 'student' && data.value.subject != '多学科') {
      getAnswerList()
    }
  } catch {
  }
}
async function getAnswerList(row) {
  const res = await request({
    apiPath: '/getStudentAnswerList',
    body: {
      id: data.value.scorereportconfigId
    }
  })
  answerlist.value = res.data
}
async function openQa(row) {
  const res = await request({
    apiPath: '/getQuestionAndAnswer',
    body: {
      id: data.value.scorereportconfigId,
      questionName: row.questionName
    }
  })
  qimage.value = res.data.question
  aimage.value = res.data.answer
  qadialog.value = true
}
function closeQa() {
  qadialog.value = false
  qimage.value = ''
  aimage.value = ''
}
async function openSa(row, stu) {
  const res = await request({
    apiPath: '/getStudentQuestionAnswer',
    body: {
      id: data.value.scorereportconfigId,
      studentAccount: stu,
      questionName: row.questionName
    }
  })
  saimage.value = res.data
  sadialog.value = true
}
function closeSa() {
  sadialog.value = false
  saimage.value = []
}
async function openAa(stu) {
  const res = await request({
    apiPath: '/getStudentAnswerImage',
    body: {
      id: data.value.scorereportconfigId,
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
      studentAccount: stu.studentAccount
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
      field: 'studentAccount',
      title: '学生ID'
    },
    ...[...subjects].map(subject => ({
      title: subject,
      children: [...fields].map(field => ({
        field: subject + '_' + field,
        title: titlemap[field]
      }))
    }))
  ]
}
function formatScoringRate(a) {
  return a.cellValue + '%'
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/scorereport' }" label="成绩报告"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/scorereportinfo' }" label="报告详情"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div v-if="accountinfo.type == 'teacher'" class="cz">
      <div class="sp">
        <div class="bold-text">平均分</div>
        <div>{{ data.averageScore }}</div>
      </div>
      <div class="sp">
        <div class="bold-text">标准差</div>
        <div>{{ data.scoreStandardDeviation }}</div>
      </div>
      <tiny-tabs v-model="tabname">
        <tiny-tab-item title="成绩单" name="成绩单">
          <template #default>
            <tiny-grid v-if="data.subject == '多学科'" :data="tabledata" :columns="columns" align="center"
              border="true"></tiny-grid>
            <tiny-grid v-if="data.subject != '多学科'" :data="data.student" border="true">
              <tiny-grid-column type="index" title="序号" align="center"></tiny-grid-column>
              <tiny-grid-column title="学生ID" align="center">
                <template #default="{ row }">
                  <div class="clickwz" @click="openAa(row.studentAccount)">{{ row.studentAccount }}</div>
                </template>
              </tiny-grid-column>
              <tiny-grid-column field="totalScoreWithExtra" title="分数（含附）" align="center"></tiny-grid-column>
              <tiny-grid-column field="totalScoreWithoutExtra" title="分数（不含附）" align="center"></tiny-grid-column>
              <tiny-grid-column field="extraTotalScore" title="附分" align="center"></tiny-grid-column>
              <tiny-grid-column v-if="fu == true" field="fuScore" title="赋分" align="center"></tiny-grid-column>
              <tiny-grid-column v-if="fu == true" field="level" title="等级" align="center"></tiny-grid-column>
              <tiny-grid-column field="jointRank" title="联次" align="center"></tiny-grid-column>
              <tiny-grid-column v-if="data.type != 'joint'" field="schoolRank" title="校次"
                align="center"></tiny-grid-column>
              <tiny-grid-column v-if="data.type == 'class'" field="classRank" title="班次"
                align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-tab-item>
        <tiny-tab-item v-if="data.subject != '多学科'" title="小题分析" name="小题分析">
          <template #default>
            <tiny-grid :data="data.question" border="true">
              <tiny-grid-column field="questionName" title="题号" align="center">
                <template #default="{ row }">
                  <div class="clickwz" @click="openQa(row)">{{ row.questionName }}</div>
                </template>
              </tiny-grid-column>
              <tiny-grid-column field="averageScore" title="平均分" align="center"></tiny-grid-column>
              <tiny-grid-column field="scoringRate" title="得分率" :format-text="formatScoringRate"
                align="center"></tiny-grid-column>
              <tiny-grid-column field="scoreStandardDeviation" title="标准差" align="center"></tiny-grid-column>
              <tiny-grid-column title="作答详情" align="center">
                <template #default="{ row }">
                  <div v-if="row.option != undefined" class="cz">
                    <div v-for="item, index in row.optionName" class="sp">
                      <div class="bold-text">{{ item }}</div>
                      <div class="cz">
                        <div v-for="i in row.option[index]">{{ i }}</div>
                      </div>
                      <div>（{{ row.option[index].length }}人）</div>
                    </div>
                  </div>
                  <div v-if="row.score != undefined" class="cz">
                    <div v-for="item in row.score" class="sp">
                      <div class="bold-text">{{ item.score }}</div>
                      <div class="cz">
                        <div v-for="i in item.student" class="clickwz" @click="openSa(row, i)">{{ i }}</div>
                      </div>
                      <div>（{{ item.student.length }}人）</div>
                    </div>
                  </div>
                </template>
              </tiny-grid-column>
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
        <div class="bold-text">小题作答情况</div>
        <tiny-grid :data="answerlist" border="true">
          <tiny-grid-column field="questionName" title="题号" align="center">
            <template #default="{ row }">
              <div class="clickwz" @click="openQa(row)">{{ row.questionName }}</div>
            </template>
          </tiny-grid-column>
          <tiny-grid-column title="作答" align="center">
            <template #default="{ row }">
              <div v-if="row.correctAnswer != ''">{{ row.answer }}</div>
              <div v-if="row.correctAnswer == ''" class="clickwz" @click="openSa(row, '')">查看</div>
            </template>
          </tiny-grid-column>
          <tiny-grid-column title="答案" align="center">
            <template #default="{ row }">
              <div v-if="row.correctAnswer != ''">{{ row.correctAnswer }}</div>
              <div v-if="row.correctAnswer == ''" class="clickwz" @click="openQa(row)">查看</div>
            </template>
          </tiny-grid-column>
          <tiny-grid-column field="score" title="得分" align="center"></tiny-grid-column>
          <tiny-grid-column field="totalScore" title="总分" align="center"></tiny-grid-column>
        </tiny-grid>
      </div>
      <tiny-grid v-if="data.subject == '多学科'" :data="data.info.subject" border="true">
        <tiny-grid-column field="name" title="科目" align="center"></tiny-grid-column>
        <tiny-grid-column field="totalScoreWithExtra" title="分数（含附）" align="center"></tiny-grid-column>
        <tiny-grid-column field="totalScoreWithoutExtra" title="分数（不含附）" align="center"></tiny-grid-column>
        <tiny-grid-column field="extraTotalScore" title="附分" align="center"></tiny-grid-column>
        <tiny-grid-column field="fuScore" title="赋分" align="center"></tiny-grid-column>
        <tiny-grid-column field="level" title="等级" align="center"></tiny-grid-column>
      </tiny-grid>
    </div>
    <tiny-dialog-box class="dialog" :visible="qadialog" title="题目" @close="closeQa">
      <div v-if="qimage == '' || aimage == ''">未设置题目，如有疑问请联系考试管理员</div>
      <div v-if="qimage != '' && aimage != ''" class="cz">
        <div class="sp">
          <div>题目</div>
          <img :src="qimage"></img>
        </div>
        <div class="sp">
          <div>答案</div>
          <img :src="aimage"></img>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeQa">确定</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box class="dialog" :visible="sadialog" title="作答" @close="closeSa">
      <div class="cz">
        <div v-for="item in saimage">
          <img v-if="item != ''" :src="item"></img>
          <img v-if="item == ''" src="/noimage.png"></img>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeSa">确定</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box class="dialog" :visible="aadialog" title="原卷" @close="closeAa">
      <div v-if="answerimage.answerOnline == false">
        <div class="cz">
          <div v-for="image in answerimage.image">
            <AnswerImageCanvas :data="image"></AnswerImageCanvas>
          </div>
        </div>
      </div>
      <div v-if="answerimage.answerOnline == true">
        <div class="cz">
          <div v-for="image in answerimage.image" class="sp">
            <div class="bold-text">{{ image.questionName }}</div>
            <AnswerImageCanvas :data="image"></AnswerImageCanvas>
          </div>
        </div>
      </div>
      <template #footer>
        <tiny-button type="info" @click="closeAa">确定</tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>