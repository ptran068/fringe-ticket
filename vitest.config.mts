import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnvFiles } from './scripts/load-env';

loadEnvFiles(['.env.local', '.env.example']);

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  test: {
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    testTimeout: 30000,
  },
});
