import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

// https://vite.dev/config/
// mode === 'mobile' 時不載入 Electron 外掛，專注於 APK/手機版面開發
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    ...(mode === 'mobile'
      ? []
      : [
          electron([
            {
              // Main process entry
              entry: 'electron/main.ts',
            },
            {
              // Preload script
              entry: 'electron/preload.ts',
              onstart(args) {
                args.reload()
              },
            },
          ]),
          renderer(),
        ]),
  ],
  // 開發伺服器設定
  server: {
    port: 5173,
    strictPort: true,
    host: true, // 允許區網內的手機/模擬器連線（live reload 用）
  },
  // 建置輸出設定
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
