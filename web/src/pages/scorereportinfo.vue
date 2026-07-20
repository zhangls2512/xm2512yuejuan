<script setup>
document.title = '智能阅卷系统 - 成绩报告 - 报告详情'
import { ref } from 'vue'
import cookie from 'js-cookie'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
const route = useRoute()
const info = route.query.info
const accountinfo = ref({})
const data = ref({})
const tabledata = ref([])
const columns = ref([])
const tabname = ref('成绩单')
const exist = cookie.get('accountinfo')
const fu = ref(false)
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
      if (data.value.subject != '多学科' && data.student.length > 0 && data.student[0].fuScore) {
        fu.value = true
      }
    }
  } catch {
  }
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
              <tiny-grid-column field="studentAccount" title="学生ID" align="center"></tiny-grid-column>
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
              <tiny-grid-column field="questionName" title="题号" align="center"></tiny-grid-column>
              <tiny-grid-column field="averageScore" title="平均分" align="center"></tiny-grid-column>
              <tiny-grid-column field="scoringRate" title="得分率" :format-text="formatScoringRate"
                align="center"></tiny-grid-column>
              <tiny-grid-column field="scoreStandardDeviation" title="标准差" align="center"></tiny-grid-column>
              <tiny-grid-column title="作答详情" align="center">
                <template #default="{ row }">
                  <div v-if="row.option != undefined" class="cz">
                    <div v-for="item, index in row.optionName" class="sp">
                      <div v-if="index > 0" class="line"></div>
                      <div class="bold-text">{{ item }}</div>
                      <div class="cz">
                        <div v-for="i in row.option[index]">{{ i }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-if="row.score != undefined" class="cz">
                    <div v-for="item, index in row.score" class="sp">
                      <div v-if="index > 0" class="line"></div>
                      <div class="bold-text">{{ item.score }}</div>
                      <div class="cz">
                        <div v-for="i in item.student">{{ i }}</div>
                      </div>
                    </div>
                  </div>
                </template>
              </tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-tab-item>
      </tiny-tabs>
    </div>
    <div v-if="accountinfo.type == 'student'" class="cz">
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
    </div>
  </div>
</template>