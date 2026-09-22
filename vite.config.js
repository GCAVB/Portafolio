import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(
          __dirname,
          'index.html'
        ),

        atlantida360: resolve(
          __dirname,
          'proyectos',
          'atlantida360.html'
        ),

        modulo8: resolve(
          __dirname,
          'proyectos',
          'modulo-8.html'
        )
      }
    }
  },

  server: {
    host: true,
    port: 5173
  },

  preview: {
    host: true,
    port: 4173
  }
});