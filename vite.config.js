import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 27972,
    open: false,
    host: true
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
