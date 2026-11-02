import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Tự cập nhật khi có bản mới; auto-save nên nếu trang tự tải lại thì mất tối đa ~1 giây gõ
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Notes',
        short_name: 'Notes',
        description: 'Ứng dụng quản lý ghi chú',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d6efd',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Chỉ lưu sẵn "vỏ" ứng dụng (HTML, JS, CSS, ảnh tĩnh); KHÔNG lưu phản hồi API.
        // Dữ liệu ghi chú sẽ do IndexedDB quản lý ở bước sau, vì cần kiểm soát khóa mật khẩu và đăng xuất.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // Các đường dẫn này phải luôn đi tới server, không được trả về index.html
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/broadcasting\//,
          /^\/storage\//,
          /^\/sanctum\//,
          /^\/app\//,
          /^\/apps\//,
          /^\/up$/,
        ],
      },
    }),
  ],
  server: {
    // Dùng đường dẫn tương đối /api, chỉ proxy khi chạy dev (Docker đã có Nginx lo)
    proxy: { '/api': 'http://localhost:8080' },
  },
})