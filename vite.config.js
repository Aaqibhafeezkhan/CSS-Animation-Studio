import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: './',
        name: 'CSS Animation Studio',
        short_name: 'Animation Studio',
        description: 'Explore a curated library of 100 CSS animations, create keyframes, compare effects, and export portable CSS.',
        theme_color: '#6c63ff',
        background_color: '#0f0f1a',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\.md$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'docs-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
          }
        ]
      }
    })
  ]
})
