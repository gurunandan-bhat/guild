import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import '@tabler/core/dist/css/tabler.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '@tabler/core/dist/js/tabler.min.js'

import './assets/style.css'
import '@/amplifyconfigure.js'

import App from './App.vue'
import router from './router'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
