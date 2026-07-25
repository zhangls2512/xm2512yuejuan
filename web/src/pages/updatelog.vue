<script setup>
document.title = '智能阅卷系统 - 更新日志'
const data = [
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