import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// A fixed timezone keeps local-time formatting and date conversion deterministic in tests.
// Set here, in the main process, so every test worker inherits it.
process.env.TZ = 'UTC'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
