import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 75,
        branches: 70,
        functions: 70,
        statements: 75,
      },
      include: ['src/services/**', 'src/lib/**', 'src/store/**'],
      exclude: ['src/__tests__/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@cevre/supabase': resolve(__dirname, '../../packages/supabase/src'),
      '@cevre/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
