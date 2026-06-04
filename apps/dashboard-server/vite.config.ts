import { defineConfig } from 'vite';
import { browsermesh } from '@browsermesh/compiler';

export default defineConfig({
  plugins: [browsermesh({ include: ['src/workflows/**/*.ts'] })],
  build: { ssr: true, write: false },
});
