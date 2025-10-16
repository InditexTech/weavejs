// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { registerFont } from 'canvas';
import { FontLibrary } from 'skia-canvas';
import type { CanvasFonts, SkiaFonts } from './types';

export const registerCanvasFonts = (fonts: CanvasFonts) => {
  if (!fonts || fonts.length === 0) {
    return;
  }

  for (const font of fonts) {
    const { path, properties } = font;
    registerFont(path, properties);
  }
};

export const registerSkiaFonts = (fonts: SkiaFonts) => {
  if (!fonts || fonts.length === 0) {
    return;
  }

  for (const font of fonts) {
    const { family, paths } = font;
    FontLibrary.use(family, paths);
  }
};
