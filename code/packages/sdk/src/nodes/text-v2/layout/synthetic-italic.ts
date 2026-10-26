// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';

/**
 * Browsers slant ("synthesize") italic text when a font family has no italic
 * face. skia-canvas and node-canvas do not: the text comes out upright. This
 * module finds out, by rendering, whether an italic font really renders
 * slanted, so the painter can slant it itself on the server. It asks the
 * canvas, not the font library, so it works the same on every backend.
 */

/** Horizontal shear browsers use for a synthetic italic (about 14 degrees). */
export const SYNTHETIC_ITALIC_SKEW = 0.25;

const PROBE_SIZE = 64;
const PROBE_TEXT = 'HIl';
/** Min. shift (px at 64px) of the left edge between rows to count as slanted. */
const MIN_SLANT = 3;

const cache = new Map<string, boolean>();

const SIZE = /\d+(?:\.\d+)?px/;

const isItalicToken = (token: string) =>
  token === 'italic' || token === 'oblique';

const hasItalic = (font: string) => font.split(' ').some(isItalicToken);

/** Forget probe results (call after registering fonts late on a server). */
export function clearSyntheticItalicCache(): void {
  cache.clear();
}

function slantOf(font: string): number | null {
  const canvas = Konva.Util.createCanvasElement();
  canvas.width = 160;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = font;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(PROBE_TEXT, 10, 80);
  const d = ctx.getImageData(0, 0, 160, 100).data;
  const edge = (y: number) => {
    for (let x = 0; x < 160; x++) {
      if (d[(y * 160 + x) * 4 + 3] > 100) return x;
    }
    return -1;
  };
  let first = -1;
  let last = -1;
  for (let y = 0; y < 100; y++) {
    if (edge(y) < 0) continue;
    if (first < 0) first = y;
    last = y;
  }
  if (first < 0 || last - first < 8) return null;
  const height = last - first;
  const top = edge(first + Math.round(height * 0.2));
  const bottom = edge(first + Math.round(height * 0.8));
  return top < 0 || bottom < 0 ? null : top - bottom;
}

/**
 * True when `font` asks for italic but the canvas renders it upright, so the
 * painter must slant it. Always false in a browser (it slants by itself) and
 * when the probe cannot tell (no ink): never guess.
 */
export function needsSyntheticItalic(font: string): boolean {
  if (Konva.isBrowser || !hasItalic(font)) return false;
  const probe = font.replace(SIZE, `${PROBE_SIZE}px`);
  const hit = cache.get(probe);
  if (hit !== undefined) return hit;
  let result = false;
  try {
    const italic = slantOf(probe);
    const upright = slantOf(
      probe
        .split(' ')
        .filter((token) => !isItalicToken(token))
        .join(' ')
    );
    result =
      italic !== null && upright !== null && italic - upright < MIN_SLANT;
    if (italic === null || upright === null) return false; // not cached
  } catch {
    return false;
  }
  cache.set(probe, result);
  return result;
}
