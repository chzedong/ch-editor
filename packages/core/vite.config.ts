import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'CHEditor',
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`
    },
    rollupOptions: {
      external: ['lodash-es', 'nanoid', 'quill-delta', 'snabbdom', 'tiny-typed-emitter'],
      output: {
        globals: {
          'lodash-es': 'lodashEs',
          'nanoid': 'nanoid',
          'quill-delta': 'Delta',
          'snabbdom': 'snabbdom',
          'tiny-typed-emitter': 'TypedEmitter'
        }
      }
    }
  }
});
