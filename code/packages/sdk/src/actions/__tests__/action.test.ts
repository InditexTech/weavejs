// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { type R } from './shared/action.test-helpers';
import { WeaveAction } from '../action';

// Minimal concrete subclass for testing the abstract base class
class TestAction extends WeaveAction {
  trigger(_cancelAction: () => void) {
    return undefined;
  }
  onPropsChange = undefined;
  initialize = undefined;
  onInit = undefined;
  cleanup = undefined;
}

function makeEvent(
  overrides: Partial<{
    buttons: number;
    clientX: number;
    clientY: number;
    pointerType: string;
    pointerId: number;
  }> = {}
) {
  return {
    evt: {
      buttons: 0,
      clientX: 0,
      clientY: 0,
      pointerType: 'pen',
      pointerId: 1,
      ...overrides,
    },
  };
}

function makeMockInstance() {
  const mockChildLogger = { debug: vi.fn() };
  return {
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue(mockChildLogger),
    _logger: mockChildLogger,
  };
}

describe('WeaveAction', () => {
  let action: TestAction;
  let mockInstance: ReturnType<typeof makeMockInstance>;

  beforeEach(() => {
    action = new TestAction();
    mockInstance = makeMockInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / Proxy behavior ────────────────────────────────────
  describe('Suite 1: constructor / Proxy behavior', () => {
    it('1.1 tapStart initialized to { x:0, y:0, time:0 }', () => {
      expect((action as unknown as R)['tapStart']).toEqual({ x: 0, y: 0, time: 0 });
    });

    it('1.2 Proxy set: Reflect.set stores the property on the target', () => {
      (action as unknown as R)['name'] = 'test-name';
      expect((action as unknown as R)['name']).toBe('test-name');
    });

    it('1.3 Proxy set: onPropsChange?.() called when onPropsChange is defined', () => {
      const onPropsChange = vi.fn();
      (action as unknown as R)['onPropsChange'] = onPropsChange;
      // Trigger a set via the proxy
      (action as unknown as R)['props'] = { width: 100 };
      expect(onPropsChange).toHaveBeenCalled();
    });

    it('1.4 Proxy set: instance?.emitEvent called when instance is set', () => {
      (action as unknown as R)['instance'] = mockInstance;
      (action as unknown as R)['props'] = { width: 100 };
      expect(mockInstance.emitEvent).toHaveBeenCalledWith(
        'onPropsChange',
        expect.objectContaining({ instance: action })
      );
    });

    it('1.5 Proxy set: no crash when onPropsChange and instance are undefined', () => {
      expect(() => {
        (action as unknown as R)['props'] = { width: 50 };
      }).not.toThrow();
    });
  });

  // ── Suite 2: getName ─────────────────────────────────────────────────────────
  describe('Suite 2: getName', () => {
    it('2.1 getName returns this.name', () => {
      (action as unknown as R)['name'] = 'my-action';
      expect(action.getName()).toBe('my-action');
    });
  });

  // ── Suite 3: hasAliases ──────────────────────────────────────────────────────
  describe('Suite 3: hasAliases', () => {
    it('3.1 always returns false', () => {
      expect(action.hasAliases()).toBe(false);
    });
  });

  // ── Suite 4: setForceExecution ───────────────────────────────────────────────
  describe('Suite 4: setForceExecution', () => {
    it('4.1 sets forceExecution to the given value', () => {
      action.setForceExecution(true);
      expect((action as unknown as R)['forceExecution']).toBe(true);
      action.setForceExecution(false);
      expect((action as unknown as R)['forceExecution']).toBe(false);
    });
  });

  // ── Suite 5: getAliases ──────────────────────────────────────────────────────
  describe('Suite 5: getAliases', () => {
    it('5.1 returns an empty array', () => {
      expect(action.getAliases()).toEqual([]);
    });
  });

  // ── Suite 6: getLogger ───────────────────────────────────────────────────────
  describe('Suite 6: getLogger', () => {
    it('6.1 returns the logger field (populated after register)', () => {
      action.register(mockInstance as unknown as Parameters<typeof action.register>[0]);
      const logger = action.getLogger();
      expect(logger).toBe(mockInstance._logger);
    });
  });

  // ── Suite 7: register ────────────────────────────────────────────────────────
  describe('Suite 7: register', () => {
    it('7.1 sets this.instance to the provided instance', () => {
      action.register(mockInstance as unknown as Parameters<typeof action.register>[0]);
      expect((action as unknown as R)['instance']).toBe(mockInstance);
    });

    it('7.2 calls instance.getChildLogger(getName()) to set logger', () => {
      (action as unknown as R)['name'] = 'testAction';
      action.register(mockInstance as unknown as Parameters<typeof action.register>[0]);
      expect(mockInstance.getChildLogger).toHaveBeenCalledWith('testAction');
    });

    it('7.3 calls instance.getChildLogger("action").debug(...) with action name', () => {
      (action as unknown as R)['name'] = 'testAction';
      action.register(mockInstance as unknown as Parameters<typeof action.register>[0]);
      expect(mockInstance._logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('testAction')
      );
    });

    it('7.4 returns this (same reference)', () => {
      const result = action.register(
        mockInstance as unknown as Parameters<typeof action.register>[0]
      );
      expect(result).toBe(action);
    });
  });

  // ── Suite 8: updateProps ─────────────────────────────────────────────────────
  describe('Suite 8: updateProps', () => {
    it('8.1 merges new props over existing props', () => {
      (action as unknown as R)['props'] = { width: 100, height: 200 };
      action.updateProps({ width: 300 });
      expect(action.getProps()).toEqual({ width: 300, height: 200 });
    });

    it('8.2 works when this.props is initially undefined', () => {
      // props not yet set
      expect(() => action.updateProps({ opacity: 1 })).not.toThrow();
      expect(action.getProps()).toMatchObject({ opacity: 1 });
    });
  });

  // ── Suite 9: getProps ────────────────────────────────────────────────────────
  describe('Suite 9: getProps', () => {
    it('9.1 returns this.props', () => {
      const props = { width: 42, height: 24 };
      (action as unknown as R)['props'] = props;
      expect(action.getProps()).toBe(props);
    });
  });

  // ── Suite 10: isPressed ──────────────────────────────────────────────────────
  describe('Suite 10: isPressed', () => {
    it('10.1 buttons > 0 → true', () => {
      expect(action.isPressed(makeEvent({ buttons: 1 }) as never)).toBe(true);
    });

    it('10.2 buttons === 0 → false', () => {
      expect(action.isPressed(makeEvent({ buttons: 0 }) as never)).toBe(false);
    });
  });

  // ── Suite 11: setTapStart ────────────────────────────────────────────────────
  describe('Suite 11: setTapStart', () => {
    it('11.1 sets tapStart.x and tapStart.y from evt.clientX/Y', () => {
      action.setTapStart(makeEvent({ clientX: 50, clientY: 75 }) as never);
      const tapStart = (action as unknown as R)['tapStart'] as { x: number; y: number };
      expect(tapStart.x).toBe(50);
      expect(tapStart.y).toBe(75);
    });

    it('11.2 sets tapStart.time via performance.now()', () => {
      vi.spyOn(performance, 'now').mockReturnValue(12345);
      action.setTapStart(makeEvent() as never);
      const tapStart = (action as unknown as R)['tapStart'] as { time: number };
      expect(tapStart.time).toBe(12345);
    });
  });

  // ── Suite 12: isTap ──────────────────────────────────────────────────────────
  describe('Suite 12: isTap', () => {
    it('12.1 tapStart=null → false', () => {
      (action as unknown as R)['tapStart'] = null;
      expect(action.isTap(makeEvent() as never)).toBe(false);
    });

    it('12.2 pointerType="pen" + dist<10 + dt<300 → true', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);
      action.setTapStart(makeEvent({ clientX: 0, clientY: 0 }) as never);
      const result = action.isTap(
        makeEvent({ clientX: 1, clientY: 1, pointerType: 'pen' }) as never
      );
      expect(result).toBe(true);
    });

    it('12.3 pointerType="touch" + dist<10 + dt<300 → true', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);
      action.setTapStart(makeEvent({ clientX: 0, clientY: 0 }) as never);
      const result = action.isTap(
        makeEvent({ clientX: 1, clientY: 1, pointerType: 'touch' }) as never
      );
      expect(result).toBe(true);
    });

    it('12.4 pointerType="mouse" → false', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(50);
      action.setTapStart(makeEvent({ clientX: 0, clientY: 0 }) as never);
      const result = action.isTap(
        makeEvent({ clientX: 1, clientY: 1, pointerType: 'mouse' }) as never
      );
      expect(result).toBe(false);
    });

    it('12.5 pointerType="pen" + dist>=10 → false', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(50);
      action.setTapStart(makeEvent({ clientX: 0, clientY: 0 }) as never);
      const result = action.isTap(
        makeEvent({ clientX: 100, clientY: 0, pointerType: 'pen' }) as never
      );
      expect(result).toBe(false);
    });

    it('12.6 pointerType="pen" + dt>=300 → false', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(500);
      action.setTapStart(makeEvent({ clientX: 0, clientY: 0 }) as never);
      const result = action.isTap(
        makeEvent({ clientX: 1, clientY: 1, pointerType: 'pen' }) as never
      );
      expect(result).toBe(false);
    });

    it('12.7 after setTapStart resets, uses updated reference point', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(50);
      action.setTapStart(makeEvent({ clientX: 50, clientY: 50 }) as never);
      // Tap near new start point
      const result = action.isTap(
        makeEvent({ clientX: 51, clientY: 51, pointerType: 'touch' }) as never
      );
      expect(result).toBe(true);
    });
  });
});
