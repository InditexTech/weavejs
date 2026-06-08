// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { WeaveRenderer } from '../renderer';

// ---------------------------------------------------------------------------
// Concrete subclass for testing the abstract base
// ---------------------------------------------------------------------------

class TestRenderer extends WeaveRenderer {
  constructor(name: string) {
    super();
    this.name = name;
  }

  init(): void {}
  render(_callback?: () => void): void {}
}

// ---------------------------------------------------------------------------
// Mock Weave instance
// ---------------------------------------------------------------------------

function makeMockInstance() {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const mockMainLogger = { info: vi.fn() };
  return {
    getChildLogger: vi.fn().mockReturnValue(mockLogger),
    getMainLogger: vi.fn().mockReturnValue(mockMainLogger),
    _mockLogger: mockLogger,
    _mockMainLogger: mockMainLogger,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — WeaveRenderer
// ---------------------------------------------------------------------------

describe('1 — WeaveRenderer', () => {
  it('1.1 getName returns the renderer name', () => {
    const renderer = new TestRenderer('myRenderer');
    expect(renderer.getName()).toBe('myRenderer');
  });

  it('1.2 getLogger returns the logger created during register', () => {
    const renderer = new TestRenderer('myRenderer');
    const mock = makeMockInstance();
    renderer.register(mock as never);
    expect(renderer.getLogger()).toBe(mock._mockLogger);
  });

  it('1.3 register sets this.instance to the provided Weave instance', () => {
    const renderer = new TestRenderer('myRenderer');
    const mock = makeMockInstance();
    renderer.register(mock as never);
    // Access private instance via cast
    expect((renderer as unknown as { instance: typeof mock }).instance).toBe(mock);
  });

  it('1.4 register calls getChildLogger with the renderer name', () => {
    const renderer = new TestRenderer('myRenderer');
    const mock = makeMockInstance();
    renderer.register(mock as never);
    expect(mock.getChildLogger).toHaveBeenCalledWith('myRenderer');
  });

  it('1.5 register calls getMainLogger().info with a message containing the name', () => {
    const renderer = new TestRenderer('myRenderer');
    const mock = makeMockInstance();
    renderer.register(mock as never);
    expect(mock._mockMainLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('myRenderer')
    );
  });

  it('1.6 register returns this (fluent API)', () => {
    const renderer = new TestRenderer('myRenderer');
    const mock = makeMockInstance();
    const result = renderer.register(mock as never);
    expect(result).toBe(renderer);
  });
});
