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
      ssr: true,
      lib: {
        entry: {
          client: './src/index.client.ts',
          server: './src/index.server.ts',
        },
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => {
          const extension = format === 'es' ? 'js' : 'cjs';
          return `${entryName}.${extension}`;
        },
      },
      rollupOptions: {
        external: [
          '@inditextech/weavejs-sdk',
          'crypto',
          'express',
          'node:stream',
          'stream',
          'node:url',
          'url',
          'node:util',
          'util',
          'yjs',
          'ws',
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

      reporters: ['default', 'json', 'vitest-sonar-reporter'],
      outputFile: {
        json: 'reports/test-report/test-report.json',
        html: 'reports/test-report/test-report.html',
        ['vitest-sonar-reporter']: 'reports/vite-sonar/sonar-report.xml',
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
