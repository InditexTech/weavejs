// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig([
  {
    entry: {
      types: './src/index.types.ts',
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
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/types.stats.html',
      }) as any,
    ],
  },
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
    dts: false,
    platform: 'browser',
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/sdk.stats.html',
      }) as any,
    ],
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
    dts: false,
    platform: 'node',
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/sdk.node.stats.html',
      }) as any,
    ],
  },
  {
    entry: {
      'stage-minimap.worker':
        './src/plugins/stage-minimap/stage-minimap.worker.ts',
    },
    format: ['es'],
    target: 'es2023',
    clean: true,
    dts: false,
    platform: 'browser',
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stage-minimap.worker.stats.html',
      }) as any,
    ],
  },
]);
