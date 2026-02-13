import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: [
      {
        find: /^@\/atoms$/,
        replacement: fileURLToPath(
          new URL('./src/components/atoms', import.meta.url),
        ),
      },
      {
        find: /^@\/molecules$/,
        replacement: fileURLToPath(
          new URL('./src/components/molecules', import.meta.url),
        ),
      },
      {
        find: /^@\/organisms$/,
        replacement: fileURLToPath(
          new URL('./src/components/organisms', import.meta.url),
        ),
      },
      {
        find: /^@\/templates$/,
        replacement: fileURLToPath(
          new URL('./src/components/templates', import.meta.url),
        ),
      },
      {
        find: /^@\/pages$/,
        replacement: fileURLToPath(new URL('./src/pages', import.meta.url)),
      },
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
});
