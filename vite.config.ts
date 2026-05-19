import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Production (Vultr): / — optional VITE_BASE_PATH for subpath hosting */
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  root: 'frontend',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
      '@data': path.resolve(__dirname, 'data'),
      '@backend': path.resolve(__dirname, 'backend'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
