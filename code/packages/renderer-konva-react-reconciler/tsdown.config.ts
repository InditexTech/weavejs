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
    external: ['@inditextech/weave-sdk', '@inditextech/weave-types', 'konva'],
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
      ['renderer-konva-react-reconciler']: './src/index.ts',
    },
    external: ['@inditextech/weave-sdk', '@inditextech/weave-types', 'konva'],
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
        filename: 'dist/renderer-konva-react-reconciler.stats.html',
      }) as any,
    ],
  },
  {
    entry: {
      ['renderer-konva-react-reconciler.node']: './src/index.node.ts',
    },
    external: ['@inditextech/weave-sdk', '@inditextech/weave-types', 'konva'],
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
        filename: 'dist/renderer-konva-react-reconciler.node.stats.html',
      }) as any,
    ],
  },
]);
