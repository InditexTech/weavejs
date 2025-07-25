// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default [
  defineConfig({
    entry: {
      server: './src/index.server.ts',
    },
    external: [
      '@inditextech/weave-sdk',
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
    ],
    format: ['es', 'cjs'],
    target: 'es2023',
    clean: true,
    dts: true,
    platform: 'node',
  }),
  defineConfig({
    entry: {
      client: './src/index.client.ts',
    },
    external: [
      '@inditextech/weave-sdk',
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
    ],
    format: ['es', 'cjs'],
    target: 'es2023',
    clean: true,
    dts: true,
    platform: 'browser',
  }),
];
