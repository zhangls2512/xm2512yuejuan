import { createRouter, createWebHistory } from 'vue-router'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '',
      component: () => import('/src/pages/container.vue'),
      children: [
        {
          path: '',
          component: () => import('/src/pages/login.vue')
        },
        {
          path: 'login',
          component: () => import('/src/pages/login.vue')
        },
        {
          path: 'panel',
          component: () => import('/src/pages/panel.vue'),
          children: [
            {
              path: '/accountinfo',
              component: () => import('/src/pages/accountinfo.vue')
            },
            {
              path: '/teacheraccount',
              component: () => import('/src/pages/teacheraccount.vue')
            },
            {
              path: '/studentaccount',
              component: () => import('/src/pages/studentaccount.vue')
            },
            {
              path: '/class',
              component: () => import('/src/pages/class.vue')
            },
            {
              path: '/classinfo',
              component: () => import('/src/pages/classinfo.vue')
            },
            {
              path: '/processingexam',
              component: () => import('/src/pages/processingexam.vue')
            },
            {
              path: '/newexam',
              component: () => import('/src/pages/newexam.vue')
            },
            {
              path: '/endexam',
              component: () => import('/src/pages/endexam.vue')
            },
            {
              path: '/updateexam',
              component: () => import('/src/pages/updateexam.vue')
            },
            {
              path: '/question',
              component: () => import('/src/pages/question.vue')
            },
            {
              path: '/scorereport',
              component: () => import('/src/pages/scorereport.vue')
            },
            {
              path: '/onlineexam',
              component: () => import('/src/pages/onlineexam.vue')
            },
            {
              path: '/processingmarktask',
              component: () => import('/src/pages/processingmarktask.vue')
            },
            {
              path: '/endmarktask',
              component: () => import('/src/pages/endmarktask.vue')
            },
            {
              path: '/examsubjectconfig',
              component: () => import('/src/pages/examsubjectconfig.vue')
            },
            {
              path: '/newquestion',
              component: () => import('/src/pages/newquestion.vue')
            },
            {
              path: '/updatequestion',
              component: () => import('/src/pages/updatequestion.vue')
            },
            {
              path: '/answeronlineexam',
              component: () => import('/src/pages/answeronlineexam.vue')
            },
            {
              path: '/examsubjectanswer',
              component: () => import('/src/pages/examsubjectanswer.vue')
            },
            {
              path: '/mark',
              component: () => import('/src/pages/mark.vue')
            },
            {
              path: '/markprogress',
              component: () => import('/src/pages/markprogress.vue')
            },
            {
              path: '/dealquestion',
              component: () => import('/src/pages/dealquestion.vue')
            },
            {
              path: '/scorereportconfig',
              component: () => import('/src/pages/scorereportconfig.vue')
            },
            {
              path: '/scorereportinfo',
              component: () => import('/src/pages/scorereportinfo.vue')
            },
            {
              path: '/supplyscore',
              component: () => import('/src/pages/supplyscore.vue')
            },
            {
              path: '/markqualitymonitor',
              component: () => import('/src/pages/markqualitymonitor.vue')
            }
          ]
        }
      ]
    },
    {
      path: '/updatelog',
      component: () => import('/src/pages/updatelog.vue')
    }
  ]
})
export default router