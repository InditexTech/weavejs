// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import { WeaveStrokeNode } from '../stroke';
import { densify, recordDrawCalls } from './shared/stroke-render.helpers';

describe('look preview', () => {
  const attrs = {
    strokeElements: densify(
      [
        { x: 10, y: 10 },
        { x: 80, y: 40 },
        { x: 10, y: 70 },
      ],
      3,
      0.8
    ),
    strokeWidth: 10,
    stroke: '#000000ff',
  };
  const roundLook = { ...WEAVE_STROKE_LEGACY_LOOK, outline: 'round' };

  it('changes drawing when on and restores it when off', () => {
    const node = new WeaveStrokeNode();
    const before = recordDrawCalls(attrs, node);
    node.setLookPreview(roundLook);
    expect(node.getLookPreview()?.outline).toBe('round');
    const during = recordDrawCalls(attrs, node);
    expect(during).not.toEqual(before);
    node.setLookPreview(null);
    expect(node.getLookPreview()).toBeNull();
    expect(recordDrawCalls(attrs, node)).toEqual(before);
  });

  it('never changes the stroke attributes', () => {
    const node = new WeaveStrokeNode();
    const snapshot = JSON.stringify(attrs);
    node.setLookPreview(roundLook);
    recordDrawCalls(attrs, node);
    node.setLookPreview(null);
    expect(JSON.stringify(attrs)).toBe(snapshot);
    expect('look' in attrs).toBe(false);
  });

  it('ignores an invalid preview', () => {
    const node = new WeaveStrokeNode();
    node.setLookPreview('nonsense');
    expect(node.getLookPreview()).toBeNull();
  });
});
