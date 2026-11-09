import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Development: EXPLICADOR_SERVER=http://127.0.0.1:<port> npm run dev:server -w viewer
// proxies /api to a running bridge (MCP server or `npm run preview:scene`).
const server = process.env.EXPLICADOR_SERVER;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2500 },
  server: server ? { proxy: { '/api': { target: server, changeOrigin: true } } } : {},
});
