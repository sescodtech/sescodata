import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Output to dist/ — this is what you upload to cPanel or deploy to Vercel
    outDir: 'dist',
    // Inline small assets so cPanel uploads are simpler
    assetsInlineLimit: 4096,
  },
  server: {
    port: 5173,
    // Proxy API calls to backend during local development
    // so you don't have to deal with CORS locally
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/payment': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
