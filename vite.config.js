import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 27972,
    open: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:27972',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 27972,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
