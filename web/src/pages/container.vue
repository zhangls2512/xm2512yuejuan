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
      <div class="footer-text">Version 1.0.0</div>
      <tiny-divider direction="vertical"></tiny-divider>
      <router-link class="footer-text" to="/updatelog" target="_blank">更新日志</router-link>
    </div>
  </div>
</template>