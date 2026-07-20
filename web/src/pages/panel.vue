<script setup>
document.title = '智能阅卷系统'
import { ref } from 'vue'
import icon from '@opentiny/vue-icon'
import router from '../router'
const tabs = ref([])
if (!localStorage.getItem('authorization')) {
  router.push('/login')
}
const exist = localStorage.getItem('accountinfo')
if (exist) {
  const accountinfo = JSON.parse(exist)
  if (accountinfo.type == 'admin' && !accountinfo.schoolId) {
    tabs.value = [
      {
        id: 'accountinfo',
        label: '账号信息',
        customIcon: icon.IconUser()
      },
      {
        id: '',
        label: '账号管理',
        customIcon: icon.IconAdministrator(),
        children: [
          {
            id: 'teacheraccount',
            label: '老师'
          }
        ]
      },
      {
        id: '',
        label: '考试管理',
        customIcon: icon.IconFeedback(),
        children: [
          {
            id: 'processingexam',
            label: '进行中'
          },
          {
            id: 'endexam',
            label: '已结束'
          }
        ]
      },
      {
        id: 'question',
        label: '题目管理',
        customIcon: icon.IconDocument()
      },
      {
        id: 'logout',
        label: '退出登录',
        customIcon: icon.IconGoBack()
      }
    ]
  }
  if (accountinfo.type == 'admin' && accountinfo.schoolId) {
    tabs.value = [
      {
        id: 'accountinfo',
        label: '账号信息',
        customIcon: icon.IconUser()
      },
      {
        id: '',
        label: '账号管理',
        customIcon: icon.IconAdministrator(),
        children: [
          {
            id: 'teacheraccount',
            label: '老师'
          },
          {
            id: 'studentaccount',
            label: '学生'
          }
        ]
      },
      {
        id: 'class',
        label: '班级管理',
        customIcon: icon.IconTeams()
      },
      {
        id: '',
        label: '考试管理',
        customIcon: icon.IconFeedback(),
        children: [
          {
            id: 'processingexam',
            label: '进行中'
          },
          {
            id: 'endexam',
            label: '已结束'
          }
        ]
      },
      {
        id: 'question',
        label: '题目管理',
        customIcon: icon.IconDocument()
      },
      {
        id: 'logout',
        label: '退出登录',
        customIcon: icon.IconGoBack()
      }
    ]
  }
  if (accountinfo.type == 'teacher') {
    tabs.value = [
      {
        id: 'accountinfo',
        label: '账号信息',
        customIcon: icon.IconUser()
      },
      {
        id: '',
        label: '考试管理',
        customIcon: icon.IconFeedback(),
        children: [
          {
            id: 'processingexam',
            label: '进行中'
          },
          {
            id: 'endexam',
            label: '已结束'
          }
        ]
      },
      {
        id: '',
        label: '阅卷任务',
        customIcon: icon.IconExpressSearch(),
        children: [
          {
            id: 'processingmarktask',
            label: '进行中'
          },
          {
            id: 'endmarktask',
            label: '已结束'
          }
        ]
      },
      {
        id: 'scorereport',
        label: '成绩报告',
        customIcon: icon.IconFileExcel()
      },
      {
        id: 'logout',
        label: '退出登录',
        customIcon: icon.IconGoBack()
      }
    ]
  }
  if (accountinfo.type == 'student') {
    tabs.value = [
      {
        id: 'accountinfo',
        label: '账号信息',
        customIcon: icon.IconUser()
      },
      {
        id: 'scorereport',
        label: '成绩报告',
        customIcon: icon.IconFileExcel()
      },
      {
        id: 'onlineexam',
        label: '在线考试',
        customIcon: icon.IconFeedback()
      },
      {
        id: 'logout',
        label: '退出登录',
        customIcon: icon.IconGoBack()
      }
    ]
  }
}
function tabClick(data) {
  if (data.id == 'logout') {
    TinyModal.confirm({
      status: 'info',
      title: '提示',
      message: '确定退出登录？',
      events: {
        confirm() {
          localStorage.removeItem('authorization')
          localStorage.removeItem('accountinfo')
          router.push('/login')
          TinyModal.message({
            message: '已退出登录',
            status: 'success'
          })
        }
      }
    })
  } else {
    if (data.id) {
      router.push('/' + data.id)
    }
  }
}
</script>

<template>
  <div class="main">
    <tiny-tree-menu :data="tabs" :show-filter="false" @node-click="tabClick"></tiny-tree-menu>
    <router-view class="tab-container"></router-view>
  </div>
</template>