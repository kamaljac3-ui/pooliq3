import { defineConfig } from 'vite';

// The production build is mounted at /dream/ inside the 48th State Studios site; dev serves from the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dream/' : '/',
  build: { chunkSizeWarningLimit: 1500 },
}));
