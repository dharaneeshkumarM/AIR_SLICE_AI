import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    allowedHosts: ['air-slice-ai.onrender.com', '.onrender.com', 'localhost'],
  },
  server: {
    allowedHosts: ['air-slice-ai.onrender.com', '.onrender.com', 'localhost'],
  },
});
