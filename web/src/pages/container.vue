<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png" loading="lazy"></img>
        <div class="header-title">智能阅卷系统</div>
      </div>
    </div>
    <router-view class="empty"></router-view>
    <div class="footer">
      <div class="footer-text">Version 1.0.4</div>
      <tiny-divider direction="vertical"></tiny-divider>
      <a class="footer-text" href="https://docs.qq.com/doc/p/cfe2a8b2b5709cadd6d9048aa4fd001678197397"
        target="_blank">帮助文档</a>
      <tiny-divider direction="vertical"></tiny-divider>
      <router-link class="footer-text" to="/updatelog" target="_blank">更新日志</router-link>
    </div>
  </div>
</template>