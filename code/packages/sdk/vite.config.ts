// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { type PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';
import { compression } from 'vite-plugin-compression2';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env.NODE_ENV = mode; // Make sure NODE_ENV matches mode when building

  const inProdMode = mode === 'production';

  return {
    build: {
      lib: {
        entry: './src/index.ts',
        name: 'sdk',
        formats: ['es', 'cjs'],
        fileName: 'sdk',
      },
      rollupOptions: {
        external: [
          'react',
          '@types/react',
          'yjs',
          '@syncedstore/core',
          /konva.*/,
        ],
      },
    },

    resolve: {
      alias: {
        ['@']: path.resolve(__dirname, './src'),
      },
    },

    plugins: [
      dts({ rollupTypes: true }) as PluginOption & { name: string },
      inProdMode && compression(),
    ],

    define: {
      ['process.env.NODE_ENV']: JSON.stringify(process.env.NODE_ENV),
    },

    test: {
      globals: false,

      // environment: "jsdom",

      environmentOptions: {
        url: 'http://localhost',
      },

      setupFiles: path.resolve(__dirname, 'vitest.setup.ts'),

      include: ['**/*.test.ts'],
      exclude: ['**/node_modules/**'],

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
  };
});
