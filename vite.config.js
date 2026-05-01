import { defineConfig } from 'vite';

export default defineConfig({
  base: '/debugger-stg/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
