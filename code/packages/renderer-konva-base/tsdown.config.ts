// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: {
      ['renderer-konva-base']: './src/index.ts',
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
      ['renderer-konva-base.node']: './src/index.node.ts',
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
]);
