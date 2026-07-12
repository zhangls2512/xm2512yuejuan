<template>
  <router-view></router-view>
</template>

<style>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.in-container {
  align-items: center;
  display: flex;
  justify-content: center;
}

.tab-container {
  margin-left: 20px;
  width: 100%;
}

.header {
  align-items: center;
  background-color: #0DC2B3;
  display: flex;
  padding: 20px 5% 20px 5%;
}

.main {
  display: flex;
  padding: 20px 5% 20px 5%;
}

.empty {
  flex-grow: 1;
}

.footer {
  align-items: center;
  background-color: #FAFAFA;
  display: flex;
  padding: 20px 5% 20px 5%;
}

@media (prefers-color-scheme: dark) {
  .footer {
    background-color: #1A1A1A;
  }
}

.sp {
  align-items: center;
  display: flex;
  gap: 10px;
}

.czsp {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.cz {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.kuang {
  align-items: center;
  border: 1px solid grey;
  border-radius: 20px;
  display: flex;
  padding: 20px;
}

.dialog {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}

.dialog-cz {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.large-text {
  font-size: 20px;
}

.bold-text {
  font-weight: bold;
}

.large-bold-text {
  font-size: 20px;
  font-weight: bold;
}

.title {
  font-size: 30px;
  font-weight: bold;
}

.header-title {
  color: white;
  font-size: 40px;
  font-weight: bold;
}

.footer-text {
  color: grey;
}

.tx {
  border-radius: 30px;
  width: 60px;
}

.spacebetween {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.end {
  display: flex;
  justify-content: end;
}

.wide-sp {
  align-items: center;
  display: flex;
  gap: 80px;
}

.line {
  background: rgb(187, 187, 187);
  height: 1px;
}

.clickwz {
  color: #0DC2B3;
  cursor: pointer;
}

.disabledwz {
  color: rgb(187, 187, 187);
}
</style>