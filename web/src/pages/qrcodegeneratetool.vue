<script setup>
document.title = '智能阅卷系统 - 二维码生成工具'
import { ref } from 'vue'
import qrcode from 'qrcode'
const content = ref('')
const qrcodeimg = ref('')
async function generateQrcode() {
  if (!content.value) {
    TinyModal.message({
      message: '请输入内容',
      status: 'warning'
    })
    return
  }
  qrcodeimg.value = await qrcode.toDataURL(content.value, {
    type: 'image/png'
  })
}
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png"></img>
        <div class="header-title">二维码生成工具</div>
      </div>
    </div>
    <div class="main">
      <div class="cz" style="align-items:center">
        <img v-if="qrcodeimg" :src="qrcodeimg" style="height:200px;width:200px"></img>
        <div class="sp">
          <tiny-input v-model="content" clearable placeholder="请输入内容"></tiny-input>
          <tiny-button type="info" @click="generateQrcode">生成</tiny-button>
        </div>
      </div>
    </div>
  </div>
</template>