<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
import time from '../util/time'
const route = useRoute()
const info = route.query.info
const data = ref({})
if (info) {
  try {
    data.value = decode(info)
    document.title = '智能阅卷系统 - ' + data.value.backname + ' - 科目配置'
    if (data.value.subject.answerOnline) {
      data.value.subject.startTime = time(data.value.subject.startTime)
      data.value.subject.endTime = time(data.value.subject.endTime)
    }
  } catch {
  }
}
function formatCorrectOptionIndex(a) {
  return a.cellValue.map(index => data.value.subject.objectiveQuestion[a.$rowIndex].option[index]).join('')
}
function formatSpecialOptionIndex(a, i) {
  return a.map(index => data.value.subject.objectiveQuestion[i].option[index]).join('')
}
function formatPage(p) {
  const result = []
  p.forEach(item => {
    if (item.objectiveQuestionName) {
      result.push(item.objectiveQuestionName)
    }
    if (item.markGroupName) {
      result.push(item.markGroupName)
    }
  })
  return result.join()
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: data.backpath }" :label="data.backname"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/examsubjectinfo' }" label="科目配置"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="large-bold-text">{{ data.exam.name }}</div>
      <tiny-tag type="info" style="flex-shrink:0">{{ data.exam.type }}</tiny-tag>
      <div class="bold-text">时间</div>
      <div>{{ data.exam.time }}</div>
      <div class="bold-text">科目</div>
      <div>{{ data.subject.name }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">作答方式</div>
      <div v-if="data.subject.answerOnline">在线</div>
      <div v-if="!data.subject.answerOnline">扫描</div>
    </div>
    <div v-if="data.subject.answerOnline" class="sp">
      <div class="bold-text">作答开始时间</div>
      <div>{{ data.subject.startTime }}</div>
    </div>
    <div v-if="data.subject.answerOnline" class="sp">
      <div class="bold-text">作答结束时间</div>
      <div>{{ data.subject.endTime }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">班级</div>
      <div class="cz">
        <div v-for="item in data.subject.class">{{ item }}</div>
      </div>
    </div>
    <div class="sp">
      <div class="bold-text">管理员</div>
      <tiny-grid :data="data.subject.admin" style="flex:1">
        <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
        <tiny-grid-column field="permission" title="权限" align="center" show-overflow></tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="sp">
      <div class="bold-text">客观题</div>
      <tiny-grid :data="data.subject.objectiveQuestion" style="flex:1">
        <tiny-grid-column field="name" title="题号" align="center"></tiny-grid-column>
        <tiny-grid-column v-if="data.subject.subSubject.length > 0" field="subject" title="科目"
          align="center"></tiny-grid-column>
        <tiny-grid-column field="option" title="选项" align="center"></tiny-grid-column>
        <tiny-grid-column field="questionId" title="题目ID" align="center"></tiny-grid-column>
        <tiny-grid-column field="extra" title="附加题" align="center" format-text="boole"></tiny-grid-column>
        <tiny-grid-column field="correctOptionIndex" title="正确选项" align="center"
          :format-text="formatCorrectOptionIndex"></tiny-grid-column>
        <tiny-grid-column title="正确选项个数规则" align="center">
          <template #default="{ row }">
            <tiny-grid :data="row.correctOptionCountRule" style="flex:1">
              <tiny-grid-column field="count" title="个数" align="center"></tiny-grid-column>
              <tiny-grid-column field="score" title="分数" align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-grid-column>
        <tiny-grid-column title="特殊选项组合规则" align="center">
          <template #default="{ row, $rowIndex }">
            <tiny-grid :data="row.specialOptionGroupRule" style="flex:1">
              <tiny-grid-column field="optionIndex" title="选项" align="center">
                <template #default="{ row: rule }">
                  <div>{{ formatSpecialOptionIndex(rule.optionIndex, $rowIndex) }}</div>
                </template>
              </tiny-grid-column>
              <tiny-grid-column field="score" title="分数" align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">主观题</div>
      <tiny-grid :data="data.subject.subjectiveQuestion" style="flex:1">
        <tiny-grid-column field="name" title="题号" align="center"></tiny-grid-column>
        <tiny-grid-column v-if="data.subject.subSubject.length > 0" field="subject" title="科目"
          align="center"></tiny-grid-column>
        <tiny-grid-column field="questionId" title="题目ID" align="center"></tiny-grid-column>
        <tiny-grid-column field="extra" title="附加题" align="center" format-text="boole"></tiny-grid-column>
        <tiny-grid-column field="arbitrateScoreDiff" title="仲裁分差" align="center"></tiny-grid-column>
        <tiny-grid-column title="步骤分" align="center">
          <template #default="{ row }">
            <div v-for="item, index in row.stepScore">步骤{{ index + 1 }}：{{ item.join() }}</div>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">阅卷组</div>
      <tiny-grid :data="data.subject.markGroup" style="flex:1">
        <tiny-grid-column field="name" title="名称" align="center"></tiny-grid-column>
        <tiny-grid-column field="questionName" title="题号" align="center"></tiny-grid-column>
        <tiny-grid-column title="管理员" align="center">
          <template #default="{ row }">
            <tiny-grid :data="row.admin" style="flex:1">
              <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
              <tiny-grid-column field="permission" title="权限" align="center" show-overflow></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-grid-column>
        <tiny-grid-column title="阅卷人" align="center">
          <template #default="{ row }">
            <tiny-grid :data="row.member" style="flex:1">
              <tiny-grid-column field="account" title="账号" align="center"></tiny-grid-column>
              <tiny-grid-column field="quota" title="任务量" align="center"></tiny-grid-column>
              <tiny-grid-column field="allowExceedQuota" title="允许超任务量" align="center"
                format-text="boole"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="consistencyCheckPercent" title="分数一致性检测比例" align="center"></tiny-grid-column>
        <tiny-grid-column field="time" title="评数" align="center"></tiny-grid-column>
        <tiny-grid-column field="secondMarkPercent" title="双评比例" align="center"></tiny-grid-column>
        <tiny-grid-column field="arbitrator" title="仲裁人" align="center"></tiny-grid-column>
      </tiny-grid>
    </div>
    <div class="line"></div>
    <div class="sp">
      <div class="bold-text">分卷</div>
      <tiny-grid :data="data.subject.volume" style="flex:1">
        <tiny-grid-column field="name" title="名称" align="center"></tiny-grid-column>
        <tiny-grid-column title="各页题号/阅卷组名称" align="center">
          <template #default="{ row }">
            <div v-for="item, index in row.page">第{{ index + 1 }}页：{{ formatPage(item) }}</div>
          </template>
        </tiny-grid-column>
        <tiny-grid-column title="选做题" align="center">
          <template #default="{ row }">
            <tiny-grid :data="row.optionalQuestion" style="flex:1">
              <tiny-grid-column field="name" title="题号" align="center"></tiny-grid-column>
              <tiny-grid-column field="selectCount" title="选择数量" align="center"></tiny-grid-column>
            </tiny-grid>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
  </div>
</template>