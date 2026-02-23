import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel은 루트 도메인에 배포되므로 base는 '/'로 설정
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Trip OS',
        short_name: 'Trip OS',
        description: '여행 일정을 관리하는 PWA',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // 환율 API는 앱 로직에서 캐시하므로 Service Worker에서는 캐시하지 않음
        // (기존 localStorage 기반 TTL 24시간 캐시 전략 유지)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/],
        // SPA 라우팅 지원
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
