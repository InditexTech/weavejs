// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    types: './src/index.ts',
  },
  format: ['es'],
  target: 'es2023',
  clean: true,
  dts: true,
  platform: 'neutral',
});
