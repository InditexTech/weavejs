// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    react: './src/index.ts'
  },
  format: ['es', 'cjs'],
  target: 'esnext',
  inputOptions: {
    jsx: 'react-jsx',
  },
  clean: true,
  dts: true,
  platform: 'neutral',
  report: true,
});
