import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Project-Kant/',
  server: {
    port: 8000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
