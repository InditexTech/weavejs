// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { registerKeyboardHandlers } from '../../events/keyboard';

function setup() {
  const abort = new AbortController();
  const hover = { nodes: vi.fn() };
  const shape = { fire: vi.fn() };
  const stage = {
    container: () => document.createElement('div'),
    getPointerPosition: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    getIntersection: vi.fn().mockReturnValue(shape),
  };
  const ctx = {
    getWeaveInstance: () => ({
      getStage: () => stage,
      getEventsController: () => abort,
    }),
    getTransformerController: () => ({ getHoverTransformer: () => hover }),
  };
  registerKeyboardHandlers(ctx as never);
  return { abort, hover, shape, stage };
}

const key = (type: string, k: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { key: k }));

describe('hover halo and Ctrl/Cmd', () => {
  it('hides on Ctrl/Cmd keydown and restores on keyup', () => {
    const t = setup();
    key('keydown', 'Control');
    expect(t.hover.nodes).toHaveBeenCalledWith([]);
    key('keyup', 'Control');
    expect(t.shape.fire).toHaveBeenCalledWith(
      'pointerover',
      expect.objectContaining({ evt: { ctrlKey: false, metaKey: false } }),
      true
    );
    t.hover.nodes.mockClear();
    key('keydown', 'Meta');
    expect(t.hover.nodes).toHaveBeenCalledTimes(1);
    t.abort.abort();
  });

  it('ignores other keys and restores on window blur', () => {
    const t = setup();
    key('keydown', 'a');
    key('keyup', 'a');
    expect(t.hover.nodes).not.toHaveBeenCalled();
    expect(t.shape.fire).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('blur'));
    expect(t.shape.fire).toHaveBeenCalledTimes(1);
    t.abort.abort();
  });
});
