// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  entry: {
    types: './src/index.ts',
  },
  external: ['konva', 'yjs'],
  format: ['es'],
  target: 'es2023',
  clean: true,
  dts: true,
  platform: 'neutral',
  plugins: [
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/types.stats.html',
    }) as any,
  ],
});
