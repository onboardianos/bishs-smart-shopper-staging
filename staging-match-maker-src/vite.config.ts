import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/staging-match-maker/',
  plugins: [react()],
  resolve: { alias: { '@v1': fileURLToPath(new URL('./src/v1', import.meta.url)) } },
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets' },
});
