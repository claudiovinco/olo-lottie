import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'src/editor/index.jsx'),
        block: resolve(__dirname, 'src/block/index.jsx'),
        list: resolve(__dirname, 'src/list/index.jsx'),
        player: resolve(__dirname, 'src/player/index.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
      external: ['wp', 'React', 'ReactDOM'],
      globals: {
        wp: 'wp',
      },
    },
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
