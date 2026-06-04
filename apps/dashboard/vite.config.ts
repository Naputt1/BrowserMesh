import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [TanStackRouterVite({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/dashboard-api': {
        target: 'http://localhost:50055',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dashboard-api/, '/api'),
      },
      '/api': {
        target: 'http://localhost:50052',
        changeOrigin: true,
      },
    },
  },
});
