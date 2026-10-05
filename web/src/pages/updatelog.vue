<script setup>
document.title = '智能阅卷系统 - 更新日志'
const data = [
  {
    versionNumber: '1.5.6',
    releaseDate: '2026-10-05',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.5',
    releaseDate: '2026-10-04',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.4',
    releaseDate: '2026-10-04',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.3',
    releaseDate: '2026-10-03',
    logs: [
      {
        type: 'U',
        content: '考试科目查看配置界面用户友好化'
      },
      {
        type: 'U',
        content: '成绩报告配置列表新增详情'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.2',
    releaseDate: '2026-10-01',
    logs: [
      {
        type: 'U',
        content: '上传作答支持连续上传多个'
      },
      {
        type: 'U',
        content: '坐标制作工具客观题类型新增选项去重偏差、选项最小宽度、选项最小高度'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.1',
    releaseDate: '2026-09-27',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.5.0',
    releaseDate: '2026-09-27',
    logs: [
      {
        type: 'U',
        content: '扫描作答模式考试科目新增上传作答'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.6',
    releaseDate: '2026-09-27',
    logs: [
      {
        type: 'U',
        content: '答题卡制作工具缩小标题、子标题、题号字体大小、选项宽度'
      }
    ]
  },
  {
    versionNumber: '1.4.5',
    releaseDate: '2026-09-26',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.4',
    releaseDate: '2026-09-21',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.3',
    releaseDate: '2026-09-18',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.2',
    releaseDate: '2026-09-16',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.1',
    releaseDate: '2026-09-16',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.4.0',
    releaseDate: '2026-09-16',
    logs: [
      {
        type: 'U',
        content: '底部新增坐标制作工具'
      },
      {
        type: 'U',
        content: '答题卡制作工具全局配置新增选项边框'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.3.1',
    releaseDate: '2026-09-15',
    logs: [
      {
        type: 'U',
        content: '答题卡制作工具支持批量新增非标题类型题目、解答题类型题目新增禁答类型'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.3.0',
    releaseDate: '2026-09-14',
    logs: [
      {
        type: 'U',
        content: '底部新增答题卡制作工具、二维码生成工具'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.2.1',
    releaseDate: '2026-09-10',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.2.0',
    releaseDate: '2026-09-10',
    logs: [
      {
        type: 'U',
        content: '阅卷质量监控新增分数曲线、阅卷记录抽样可指定阅卷老师'
      },
      {
        type: 'U',
        content: '题组长可查看阅卷质量监控'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.12',
    releaseDate: '2026-09-09',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.11',
    releaseDate: '2026-09-08',
    logs: [
      {
        type: 'U',
        content: '成绩报告详情页面可下载成绩单'
      },
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.10',
    releaseDate: '2026-09-07',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.9',
    releaseDate: '2026-07-31',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.8',
    releaseDate: '2026-07-30',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
  {
    versionNumber: '1.1.7',
    releaseDate: '2026-07-30',
    logs: [
      {
        type: 'F',
        content: '修复了一些已知的问题'
      }
    ]
  },
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
        <img class="tx" src="/logo.png"></img>
        <div class="header-title">更新日志</div>
      </div>
    </div>
    <div class="main">
      <div class="cz">
        <div v-for="item in data" class="cz">
          <div class="large-bold-text">Version {{ item.versionNumber }}（发布日期：{{ item.releaseDate }}）</div>
          <div v-for="item, index in item.logs" class="cz">
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