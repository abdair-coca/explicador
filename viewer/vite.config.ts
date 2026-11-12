import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// Development: EXPLICADOR_SERVER=http://127.0.0.1:<port> npm run dev:server -w viewer
// proxies /api to a running bridge (MCP server or `npm run preview:scene`).
const server = process.env.EXPLICADOR_SERVER;

// KaTeX lists each font as woff2, woff and ttf. Only woff2 is kept (and inlined below), so no font file is emitted
// and an exported scene never points at one.
const katexWoff2Only: Plugin = {
  name: 'katex-woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!/katex\/dist\/katex(\.min)?\.css/.test(id.replaceAll('\\', '/'))) return undefined;
    return { code: code.replace(/,\s*url\([^)]*\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)/g, ''), map: null };
  },
};

export default defineConfig({
  plugins: [katexWoff2Only, react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
    // The font goes inside the CSS so exported scenes stay one file that loads nothing.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? true : undefined),
  },
  server: server ? { proxy: { '/api': { target: server, changeOrigin: true } } } : {},
});
