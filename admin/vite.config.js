import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/mreviews': {
        target: 'https://www.fcgreviews.com',
        changeOrigin: true
      },
      '/critics': {
        target: 'https://www.fcgreviews.com',
        changeOrigin: true
      }
    }
  }
})
