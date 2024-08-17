import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin ,bytecodePlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-dl','electron-store'] }),bytecodePlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('electron-dl')) {
              return 'electron-dl'
            }
          }
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(),bytecodePlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@utils': resolve('src/utils'),
      }
    },
    plugins: [vue()]
  }
})
