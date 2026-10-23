// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('id') }));
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveTextToolAction } from '../text-tool';

describe('WeaveTextToolAction params', () => {
  it('defaults are unchanged', () => {
    const t = new WeaveTextToolAction();
    expect(t.getName()).toBe('textTool');
    expect(t.initProps()).not.toHaveProperty('richText');
  });

  it('a second tool can have its own name and props', () => {
    const t = new WeaveTextToolAction({
      name: 'richTextTool',
      props: { richText: true },
    });
    expect(t.getName()).toBe('richTextTool');
    expect(t.initProps()).toMatchObject({ richText: true, fontSize: 20 });
    expect(t.props).toMatchObject({ richText: true });
  });
});
