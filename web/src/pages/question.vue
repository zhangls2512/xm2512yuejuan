<script setup>
document.title = '智能阅卷系统 - 题目管理'
import { ref } from 'vue'
import { encode } from '../util/code'
import request from '../util/request'
import router from '../router'
const data = ref([])
const currentpage = ref(1)
const pagesize = ref(10)
const total = ref(0)
const type = ref('')
const difficulty = ref('0')
const subject = ref('')
const grade = ref('')
const knowledgepointwz = ref('')
const knowledgepoint = ref([])
async function copy(value) {
  await navigator.clipboard.writeText(value)
  TinyModal.message({
    message: '内容已复制',
    status: 'success'
  })
}
function add() {
  if (!knowledgepointwz.value) {
    TinyModal.message({
      message: '请输入知识点名称',
      status: 'warning'
    })
    return
  }
  if (knowledgepoint.value.includes(knowledgepointwz.value)) {
    TinyModal.message({
      message: '知识点名称已存在',
      status: 'warning'
    })
    return
  }
  knowledgepoint.value.push(knowledgepointwz.value)
  knowledgepointwz.value = ''
}
function remove(index) {
  knowledgepoint.value.splice(index, 1)
}
async function get() {
  if (!type.value) {
    TinyModal.message({
      message: '请输入类型',
      status: 'warning'
    })
    return
  }
  if (!subject.value) {
    TinyModal.message({
      message: '请输入科目',
      status: 'warning'
    })
    return
  }
  if (knowledgepoint.value.length == 0) {
    TinyModal.message({
      message: '请新增知识点',
      status: 'warning'
    })
    return
  }
  const countres = await request({
    apiPath: '/getQuestionCount',
    body: {
      type: type.value,
      difficulty: Number(difficulty.value),
      subject: subject.value,
      grade: grade.value,
      knowledgepoint: knowledgepoint.value
    }
  })
  total.value = countres.count
  const res = await request({
    apiPath: '/getQuestionList',
    body: {
      type: type.value,
      difficulty: Number(difficulty.value),
      subject: subject.value,
      grade: grade.value,
      knowledgepoint: knowledgepoint.value,
      skip: (currentpage.value - 1) * pagesize.value,
      limit: pagesize.value
    }
  })
  data.value = res.data
}
async function currentpageChange(t) {
  currentpage.value = t
  get()
}
async function pagesizeChange(t) {
  pagesize.value = t
  get()
}
function newQuestion() {
  router.push('/newquestion')
}
function updateQuestion(info) {
  router.push('/updatequestion?info=' + encode(info))
}
async function deleteQuestion(id) {
  await request({
    apiPath: '/deleteQuestion',
    body: {
      id: id
    }
  })
  TinyModal.message({
    message: '删除成功',
    status: 'success'
  })
  get()
}
</script>

<template>
  <div class="cz">
    <div><tiny-button type="success" @click="newQuestion">新增</tiny-button></div>
    <tiny-form>
      <tiny-form-item label="类型">
        <tiny-input v-model="type" clearable placeholder="请输入类型"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="难度">
        <tiny-numeric v-model="difficulty" min="0"></tiny-numeric>
      </tiny-form-item>
      <tiny-form-item label="科目">
        <tiny-input v-model="subject" clearable placeholder="请输入科目"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="年级">
        <tiny-input v-model="grade" clearable placeholder="请输入年级"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="知识点">
        <div class="cz">
          <div class="sp">
            <tiny-input v-model="knowledgepointwz" placeholder="请输入知识点名称"></tiny-input>
            <tiny-button type="success" @click="add">添加</tiny-button>
          </div>
          <div v-for="(item, index) in knowledgepoint" class="sp">
            <tiny-tag type="info">{{ item }}</tiny-tag>
            <tiny-button type="danger" @click="remove(index)">删除</tiny-button>
          </div>
        </div>
      </tiny-form-item>
      <tiny-form-item>
        <tiny-button type="info" @click="get">搜索</tiny-button>
      </tiny-form-item>
    </tiny-form>
    <div v-for="item in data" class="kuang">
      <div class="cz">
        <div class="spacebetween">
          <div class="cz">
            <div class="sp">
              <div class="bold-text">ID</div>
              <tiny-tooltip content="点击复制" placement="top">
                <div class="clickwz" @click="copy(item.questionId)">{{ item.questionId }}</div>
              </tiny-tooltip>
            </div>
            <img :src="item.question"></img>
            <div class="sp">
              <div class="bold-text">答案</div>
              <img :src="item.answer" style="flex:1;min-width:0"></img>
            </div>
            <div class="sp">
              <div class="bold-text">类型</div>
              <div>{{ item.type }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">难度</div>
              <div>{{ item.difficulty }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">科目</div>
              <div>{{ item.subject }}</div>
            </div>
            <div v-if="item.grade != ''" class="sp">
              <div class="bold-text">年级</div>
              <div>{{ item.grade }}</div>
            </div>
            <div class="sp">
              <div class="bold-text">知识点</div>
              <tiny-tag v-for="i in item.knowledgepoint" type="info">{{ i }}</tiny-tag>
            </div>
          </div>
          <div class="sp">
            <tiny-button type="info" @click="updateQuestion(item)">修改</tiny-button>
            <tiny-popconfirm title="提示" message="删除成功后无法恢复，确定删除？" type="warning" trigger="hover"
              @confirm="deleteQuestion(item.questionId)">
              <template #reference>
                <tiny-button type="danger">删除</tiny-button>
              </template>
            </tiny-popconfirm>
          </div>
        </div>
      </div>
    </div>
    <tiny-pager mode="number" :current-page="currentpage" :page-size="pagesize" :page-sizes="[5, 10, 15, 20]"
      :total="total" @current-change="currentpageChange" @size-change="pagesizeChange"></tiny-pager>
  </div>
</template>