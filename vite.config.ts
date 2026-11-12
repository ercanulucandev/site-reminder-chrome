import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        sidepanel: resolve(root, 'sidepanel.html'),
        dashboard: resolve(root, 'dashboard.html'),
        background: resolve(root, 'src/background.ts'),
      },
      output: {
        // Service worker'ın sabit bir adı olmalı (manifest'te referans veriliyor)
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        // Chrome, "_" ile başlayan dosya adlarını reddeder; güvenli isimler kullan
        chunkFileNames: 'assets/c-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
