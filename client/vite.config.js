// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'Buffer': 'Buffer',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
