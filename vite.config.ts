import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves this project site from /lifequest/, so every asset URL needs that
// prefix. It is deliberately NOT conditional on the command: dev and preview then serve
// from the same path as production, so the router basename, the service-worker scope, and
// every asset URL behave identically everywhere. (Making it build-only meant `vite
// preview` served at / while the built HTML asked for /lifequest/… — its SPA fallback
// answered those with index.html, and the app booted to a blank page.) Anything needing
// the prefix at runtime reads import.meta.env.BASE_URL rather than repeating it.
export default defineConfig({
  base: '/lifequest/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // sqlite-wasm ships its own .wasm next to a bundler-friendly ESM entry that locates it
  // via `new URL(..., import.meta.url)`. Pre-bundling rewrites that URL and the lookup
  // breaks, so it stays out of the dep optimizer and Vite emits the wasm as an asset.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  // The SQLite worker is an ES module and imports sqlite-wasm. Vite's default worker
  // format for builds is iife, which cannot carry those imports.
  worker: { format: 'es' },
});
