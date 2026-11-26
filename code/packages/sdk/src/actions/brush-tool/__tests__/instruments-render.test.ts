// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '@/nodes/stroke/constants';
import { readStrokeLook } from '@/nodes/stroke/render/look';
import {
  densify,
  renderStroke,
} from '@/nodes/stroke/__tests__/shared/stroke-render.helpers';
import { mergeData } from '../tunables/merge';
import { createBrushInstruments } from '../tunables/presets';
import { validateBrushTunablePatch } from '../tunables/validate';

const path = densify(
  [
    { x: 20, y: 90 },
    { x: 70, y: 30 },
    { x: 130, y: 85 },
    { x: 180, y: 40 },
  ],
  3,
  0.7
);

const instruments = createBrushInstruments(8);

describe.each(instruments.map((i) => [i.id, i] as const))('instrument %s', (_id, instrument) => {
  const look = mergeData(WEAVE_STROKE_LEGACY_LOOK, instrument.look);

  it('is made of valid settings', () => {
    expect(validateBrushTunablePatch('look', instrument.look)).toEqual([]);
    for (const patch of Object.values(instrument.profiles)) {
      expect(validateBrushTunablePatch('profile', patch)).toEqual([]);
    }
  });

  it('is read back by the renderer exactly as set, so nothing is clamped away', () => {
    expect(readStrokeLook(look)).toEqual(look);
  });

  it('draws a visible stroke', () => {
    const r = renderStroke({
      strokeElements: path,
      strokeWidth: 8,
      stroke: '#000000ff',
      look,
      id: 'lab-check',
    } as never);
    let covered = 0;
    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.width; x++) if (r.covered(x, y)) covered++;
    }
    expect(covered).toBeGreaterThan(200);
  });

  it('sets the opacity and blend mode explicitly, so switching pens never leaves the last ones', () => {
    expect(typeof instrument.props.opacity).toBe('number');
    expect(typeof instrument.props.globalCompositeOperation).toBe('string');
  });
});

describe('instruments at any stroke width', () => {
  it.each([0.5, 1, 8, 64, 1000])('stay valid at a width of %s', (w) => {
    for (const instrument of createBrushInstruments(w)) {
      const look = mergeData(WEAVE_STROKE_LEGACY_LOOK, instrument.look);
      expect(validateBrushTunablePatch('look', instrument.look)).toEqual([]);
      expect(readStrokeLook(look)).toEqual(look);
    }
  });
});
