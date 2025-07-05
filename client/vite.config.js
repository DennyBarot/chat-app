import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module'; 
import { Buffer } from 'buffer';

const require = createRequire(import.meta.url); 

export default defineConfig({
  define: {
    'global': {},
    'process.env': {},
    'Buffer': JSON.stringify(Buffer)

  },
   optimizeDeps: {
    include: ['buffer']
  },
  plugins: [react()],
});
