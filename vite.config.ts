import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app under /<repo>/. Vite `base` must match so
// built asset URLs resolve. Overridable via BASE_PATH for other hosts.
const base = process.env.BASE_PATH ?? '/stock-logistics-poc/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
