import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'app'),
      'server-only': path.resolve(import.meta.dirname, 'test/server-only.ts'),
    },
  },
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node',
  },
});
