// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    sdk: './src/index.ts',
  },
  format: ['es', 'cjs'],
  target: 'es2023',
  clean: true,
  dts: true,
  platform: 'browser',
});
