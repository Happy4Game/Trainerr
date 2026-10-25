import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/data/**/*.ts'],
      // Branchement natif, couvert par les tests de bout en bout.
      exclude: ['src/data/sqlite/capacitorDatabase.ts', 'src/data/appDatabase.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        // Seuil de départ du cahier des charges : 90 % des lignes du domaine.
        'src/domain/**/*.ts': { lines: 90 },
      },
    },
  },
});
