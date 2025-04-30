// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,

    alias: {
      ['@']: path.resolve(__dirname, './src'),
    },

    environmentOptions: {
      url: 'http://localhost',
    },

    setupFiles: path.resolve(__dirname, 'vitest.setup.ts'),

    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.test-d.ts'],

    reporters: ['default', 'json'],
    outputFile: {
      json: 'reports/test-report/test-report.json',
      html: 'reports/test-report/test-report.html',
    },

    coverage: {
      provider: 'v8',
      include: ['src/**/*'],
      exclude: ['**/__tests__/*', '**/*.test.ts', '**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'reports/vite-coverage',
      enabled: false,
    },
  },
});
