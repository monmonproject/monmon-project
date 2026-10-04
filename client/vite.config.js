import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/pages/**/*.jsx', 'src/services/api.js'],
      thresholds: {
        'src/pages/**/*.jsx': { lines: 75, statements: 75, branches: 75, functions: 75 },
        'src/services/api.js': { lines: 90, statements: 90, branches: 90, functions: 90 },
      },
    },
  },
})