import '@opentiny/vue-theme/dark-theme-index.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
const darkmode = window.matchMedia('(prefers-color-scheme:dark)').matches ? true : false
if (!darkmode) {
  document.documentElement.classList.remove('dark')
}
if (darkmode) {
  document.documentElement.classList.add('dark')
}
window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', (e) => {
  const darkmode = e.matches ? true : false
  if (!darkmode) {
    document.documentElement.classList.remove('dark')
  }
  if (darkmode) {
    document.documentElement.classList.add('dark')
  }
})
const app = createApp(App)
app.use(router)
app.mount('#app')