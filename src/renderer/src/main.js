import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Lyrics from './pages/lyrics.vue'
import OCR from './pages/ocr.vue'
// 定义路由
const routes = [
    // 在这里添加您的路由配置
    // 例如: { path: '/', component: Home }
    { path: '/lyrics', component: Lyrics },
    { path: '/ocr', component: OCR }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

// 创建Vue应用实例
const app = createApp(App)

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')
