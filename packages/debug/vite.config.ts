import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CHEditorDebug',
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['@ch-editor/core'],
      output: {
        globals: {
          '@ch-editor/core': 'CHEditorCore'
        }
      }
    }
  }
});