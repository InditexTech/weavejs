// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';
import { visualizer } from 'rollup-plugin-visualizer';

export default [
  defineConfig({
    entry: {
      server: './src/index.server.ts',
    },
    external: [
      '@inditextech/weave-sdk',
      '@inditextech/weave-types',
      'node:crypto',
      'node:events',
      'node:http',
      'node:https',
      'node:net',
      'node:stream',
      'node:tls',
      'node:url',
      'node:zlib',
      'crypto',
      'events',
      'http',
      'https',
      'net',
      'stream',
      'tls',
      'url',
      'zlib',
      'konva',
      'yjs',
      'canvas',
      'skia-canvas',
    ],
    format: ['es'],
    target: 'es2023',
    clean: true,
    dts: true,
    platform: 'node',
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/server.stats.html',
      }) as any,
    ],
  }),
  defineConfig({
    entry: {
      client: './src/index.client.ts',
    },
    external: [
      '@inditextech/weave-sdk',
      '@inditextech/weave-types',
      'node:crypto',
      'node:events',
      'node:http',
      'node:https',
      'node:net',
      'node:stream',
      'node:tls',
      'node:url',
      'node:zlib',
      'crypto',
      'events',
      'http',
      'https',
      'net',
      'stream',
      'tls',
      'url',
      'zlib',
      'konva',
      'yjs',
    ],
    format: ['es'],
    target: 'es2023',
    clean: true,
    dts: true,
    platform: 'browser',
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/client.stats.html',
      }) as any,
    ],
  }),
];
