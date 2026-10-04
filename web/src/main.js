import '@opentiny/vue-theme/dark-theme-index.css'
import TinyThemeTool from '@opentiny/vue-theme/theme-tool'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
const darkmode = matchMedia('(prefers-color-scheme:dark)').matches ? true : false
if (!darkmode) {
  document.documentElement.classList.remove('dark')
}
if (darkmode) {
  document.documentElement.classList.add('dark')
}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', (e) => {
  const darkmode = e.matches ? true : false
  if (!darkmode) {
    document.documentElement.classList.remove('dark')
  }
  if (darkmode) {
    document.documentElement.classList.add('dark')
  }
})
const themeTool = new TinyThemeTool()
themeTool.changeTheme({
  data: {
    'tv-font-family': 'HarmonyOS_Sans',
    'tv-font-family-1': 'HarmonyOS_Sans'
  },
  css: `
    .tiny-button {
      --tv-Button-margin-left-btn-to-btn-md: 0;
    }
  `
})
const app = createApp(App)
app.use(router)
app.mount('#app')