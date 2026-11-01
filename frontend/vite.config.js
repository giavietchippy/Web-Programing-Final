import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Dùng đường dẫn tương đối /api, chỉ proxy khi chạy dev (Docker đã có Nginx lo)
    proxy: { '/api': 'http://localhost:8080' },
  },
})