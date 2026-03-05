// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

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
  },
]);
