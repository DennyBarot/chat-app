import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module'; 
const require = createRequire(import.meta.url); 

export default defineConfig({
  define: {
    'global': {},
    'process.env': {},
    'Buffer': 'buffer.Buffer' // Updated to use the correct reference
    // Updated to use the correct reference
  },
   optimizeDeps: {
    include: ['buffer']
  },
  plugins: [react()],
});
