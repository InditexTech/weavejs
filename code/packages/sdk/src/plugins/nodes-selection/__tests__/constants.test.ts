// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WEAVE_NODES_SELECTION_DEFAULT_CONFIG } from '../constants';

function makeAnchor(name: string) {
  return {
    hasName: (n: string) => n === name,
    stroke: vi.fn(),
    cornerRadius: vi.fn(),
    height: vi.fn(),
    offsetY: vi.fn(),
    width: vi.fn(),
    offsetX: vi.fn(),
  };
}

describe('WEAVE_NODES_SELECTION_DEFAULT_CONFIG', () => {
  describe('anchorStyleFunc', () => {
    const { anchorStyleFunc } = WEAVE_NODES_SELECTION_DEFAULT_CONFIG.selection;

    it('always sets stroke and cornerRadius', () => {
      const anchor = makeAnchor('top-left');
      anchorStyleFunc(anchor);
      expect(anchor.stroke).toHaveBeenCalledWith('#27272aff');
      expect(anchor.cornerRadius).toHaveBeenCalledWith(12);
    });

    it('sets top-center anchor dimensions', () => {
      const anchor = makeAnchor('top-center');
      anchorStyleFunc(anchor);
      expect(anchor.height).toHaveBeenCalledWith(8);
      expect(anchor.width).toHaveBeenCalledWith(32);
    });

    it('sets bottom-center anchor dimensions', () => {
      const anchor = makeAnchor('bottom-center');
      anchorStyleFunc(anchor);
      expect(anchor.height).toHaveBeenCalledWith(8);
      expect(anchor.width).toHaveBeenCalledWith(32);
    });

    it('sets middle-left anchor dimensions', () => {
      const anchor = makeAnchor('middle-left');
      anchorStyleFunc(anchor);
      expect(anchor.height).toHaveBeenCalledWith(32);
      expect(anchor.width).toHaveBeenCalledWith(8);
    });

    it('sets middle-right anchor dimensions', () => {
      const anchor = makeAnchor('middle-right');
      anchorStyleFunc(anchor);
      expect(anchor.height).toHaveBeenCalledWith(32);
      expect(anchor.width).toHaveBeenCalledWith(8);
    });
  });

  describe('onMultipleSelection', () => {
    const { onMultipleSelection } = WEAVE_NODES_SELECTION_DEFAULT_CONFIG.behaviors;

    it('returns the expected multi-selection config', () => {
      const result = onMultipleSelection();
      expect(result.resizeEnabled).toBe(true);
      expect(result.rotateEnabled).toBe(true);
      expect(result.enabledAnchors).toContain('top-left');
      expect(result.enabledAnchors).toContain('bottom-right');
    });
  });
});
