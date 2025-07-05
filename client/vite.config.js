import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module'; 


const require = createRequire(import.meta.url); 

export default defineConfig({
  plugins: [react()],
  define: {
    'global.Buffer': 'buffer.Buffer'
  },
  optimizeDeps: {
    include: ['buffer']
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  }
});

