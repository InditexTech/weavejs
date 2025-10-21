// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: {
      sdk: './src/index.ts',
    },
    external: [
      '@inditextech/weave-types',
      'konva',
      'yjs',
      'canvas',
      'skia-canvas',
    ],
    format: ['es'],
    target: 'es2023',
    shims: true,
    clean: true,
    dts: true,
    platform: 'browser',
  },
  {
    entry: {
      ['sdk.node']: './src/index.node.ts',
    },
    external: [
      '@inditextech/weave-types',
      'konva',
      'yjs',
      'canvas',
      'skia-canvas',
    ],
    format: ['es'],
    target: 'es2023',
    shims: true,
    clean: true,
    dts: true,
    platform: 'node',
  },
  {
    entry: {
      'stage-minimap.worker':
        './src/plugins/stage-minimap/stage-minimap.worker.ts',
    },
    format: ['es'],
    target: 'es2023',
    clean: true,
    dts: true,
    platform: 'browser',
  },
]);
