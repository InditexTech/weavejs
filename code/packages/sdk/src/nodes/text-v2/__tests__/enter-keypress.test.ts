// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { WeaveTextV2Node } from '../text-v2';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

function setup() {
  const node = new WeaveTextV2Node();
  const instance = {
    isServerSide: () => false,
    getEventsController: () => new AbortController(),
    getActiveAction: () => 'selectionTool',
    getPlugin: () => undefined,
  };
  (node as unknown as { instance: unknown }).instance = instance;
  node.onAdd?.();
  return node;
}

function enter(target: EventTarget) {
  const e = new KeyboardEvent('keypress', {
    code: 'Enter',
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  delete (window as unknown as { weaveTextEditing?: unknown }).weaveTextEditing;
  document.body.innerHTML = '';
});

describe('text-v2 Enter keypress handler', () => {
  it('does not cancel Enter typed into a textarea', () => {
    setup();
    const ta = document.body.appendChild(document.createElement('textarea'));
    expect(enter(ta).defaultPrevented).toBe(false);
  });

  it('does not cancel Enter while another edit session is active', () => {
    setup();
    (window as unknown as { weaveTextEditing: Record<string, string> }).weaveTextEditing =
      { 'shape-label': 'shape-label' };
    expect(enter(document.body).defaultPrevented).toBe(false);
  });

  it('still handles Enter on the page when nothing is being edited', () => {
    setup();
    expect(enter(document.body).defaultPrevented).toBe(true);
  });
});
