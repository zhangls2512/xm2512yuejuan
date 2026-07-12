<script setup>
document.title = '智能阅卷系统 - 班级管理 - 班级详情'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { decode } from '../util/code'
const route = useRoute()
const info = route.query.info
const data = ref({})
if (info) {
  try {
    data.value = decode(info)
  } catch {
  }
}
</script>

<template>
  <div class="cz">
    <tiny-breadcrumb>
      <tiny-breadcrumb-item :to="{ path: '/class' }" label="班级管理"></tiny-breadcrumb-item>
      <tiny-breadcrumb-item :to="{ path: '/classinfo' }" label="班级详情"></tiny-breadcrumb-item>
    </tiny-breadcrumb>
    <div class="sp">
      <div class="bold-text">ID</div>
      <div>{{ data.classId }}</div>
    </div>
    <div class="sp">
      <div class="bold-text">名称</div>
      <div>{{ data.name }}</div>
    </div>
    <div class="bold-text">老师</div>
    <div v-for="item in data.subject" class="sp">
      <div>{{ item.name }}</div>
      <div class="cz" style="flex:1">
        <div v-for="itema in item.teacher">{{ itema }}</div>
      </div>
    </div>
    <div class="sp">
      <div class="bold-text">学生</div>
      <div class="cz" style="flex:1">
        <div v-for="item in data.student">{{ item }}</div>
      </div>
    </div>
  </div>
</template>