import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' assert { type: 'json' };

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        options: 'src/options/index.html',
      },
    },
  },
});
