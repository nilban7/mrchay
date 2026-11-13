import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    cors: true
  },
  resolve: {
    alias: {
      '/assets': path.resolve(__dirname, 'public/assets')
    }
  }
});
