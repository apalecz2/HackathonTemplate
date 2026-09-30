import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// envDir '..' so the client reads the single root .env (only VITE_* vars reach the browser).
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
