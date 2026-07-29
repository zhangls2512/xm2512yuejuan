<script setup>
document.title = '智能阅卷系统 - 更新日志'
const data = [
  {
    versionNumber: '1.1.6',
    releaseDate: '2026-07-29',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.5',
    releaseDate: '2026-07-28',
    logs: [
      {
        type: 'U',
        content: '页面底部新增AI智能客服'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.4',
    releaseDate: '2026-07-27',
    logs: [
      {
        type: 'U',
        content: '成绩报告列表页面支持选择学校、班级，无需输入ID'
      },
      {
        type: 'U',
        content: '成绩报告详情页面新增各学校整体统计数据（对联考）、各班级整体统计数据（对学校），老师新增可查看学生小题作答情况和知识点掌握情况'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.3',
    releaseDate: '2026-07-27',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.2',
    releaseDate: '2026-07-26',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.1',
    releaseDate: '2026-07-26',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.0',
    releaseDate: '2026-07-26',
    logs: [
      {
        type: 'U',
        content: '作答记录页面新增展示时间'
      },
      {
        type: 'U',
        content: '成绩报告详情页面新增知识点分析（对老师）、知识点掌握情况（对学生），可查看题目难度、知识点'
      },
      {
        type: 'U',
        content: '在线考试页面不展示已过作答结束时间的考试'
      },
      {
        type: 'U',
        content: '客观题支持设置为选做题'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.0.4',
    releaseDate: '2026-07-25',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.0.3',
    releaseDate: '2026-07-25',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.0.2',
    releaseDate: '2026-07-25',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.0.1',
    releaseDate: '2026-07-25',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.0.0',
    releaseDate: '2026-07-25',
    logs: [
      {
        type: 'A',
        content: '第一版本'
      }
    ]
  }
]
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png" loading="lazy"></img>
        <div class="header-title">更新日志</div>
      </div>
    </div>
    <div class="main">
      <div class="cz">
        <div v-for="item in data" class="cz">
          <div class="large-bold-text">Version {{ item.versionNumber }}（发布日期：{{ item.releaseDate }}）</div>
          <div v-for="(item, index) in item.logs" class="cz">
            <div class="sp">
              <div>{{ index + 1 }}.</div>
              <tiny-tag v-if="item.type == 'A'" type="success">A</tiny-tag>
              <tiny-tag v-if="item.type == 'U'" type="info">U</tiny-tag>
              <tiny-tag v-if="item.type == 'F'" color="grey">F</tiny-tag>
              <div>{{ item.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>