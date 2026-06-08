// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveActionsManager } from '../actions';
import type { Weave } from '@/weave';
import type { WeaveAction } from '@/actions/action';
import type { WeaveElementAttributes } from '@inditextech/weave-types';

function makeMockLogger() {
  return { debug: vi.fn(), error: vi.fn() };
}

function makeMockAction(overrides: Partial<WeaveAction> = {}): WeaveAction {
  return {
    setForceExecution: vi.fn(),
    trigger: vi.fn().mockReturnValue({ result: 'payload' }),
    cleanup: vi.fn(),
    updateProps: vi.fn(),
    getProps: vi.fn().mockReturnValue({ color: 'red' }),
    ...overrides,
  } as unknown as WeaveAction;
}

function makeMockWeave(actions: Record<string, WeaveAction> = {}) {
  const logger = makeMockLogger();
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getActionsHandlers: vi.fn().mockReturnValue(actions),
    emitEvent: vi.fn(),
  };
  return { weave: weave as unknown as Weave, logger };
}

describe('WeaveActionsManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "actions-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveActionsManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('actions-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveActionsManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Actions manager created');
    });
  });

  describe('getActiveAction()', () => {
    it('returns undefined initially', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveActionsManager(weave);
      expect(mgr.getActiveAction()).toBeUndefined();
    });

    it('returns the action name after triggerAction', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(mgr.getActiveAction()).toBe('myAction');
    });
  });

  describe('triggerAction()', () => {
    it('throws when actionName is undefined', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveActionsManager(weave);
      expect(() => mgr.triggerAction(undefined as unknown as string)).toThrow(
        'Action name is required'
      );
    });

    it('throws when action not registered', () => {
      const { weave } = makeMockWeave({});
      const mgr = new WeaveActionsManager(weave);
      expect(() => mgr.triggerAction('missing')).toThrow(
        'Action handler with name [missing] not registered'
      );
    });

    it('cancels the previously active action before triggering a new one', () => {
      const actionA = makeMockAction();
      const actionB = makeMockAction();
      const { weave } = makeMockWeave({ actionA, actionB });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('actionA');
      mgr.triggerAction('actionB');
      expect(actionA.cleanup).toHaveBeenCalled();
    });

    it('sets activeAction to actionName when forceExecution is false', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction', undefined, false);
      expect(mgr.getActiveAction()).toBe('myAction');
    });

    it('does NOT set activeAction when forceExecution is true', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction', undefined, true);
      expect(mgr.getActiveAction()).toBeUndefined();
    });

    it('calls handler.setForceExecution(false) by default', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(action.setForceExecution).toHaveBeenCalledWith(false);
    });

    it('calls handler.setForceExecution(true) when forceExecution=true', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction', undefined, true);
      expect(action.setForceExecution).toHaveBeenCalledWith(true);
    });

    it('calls handler.trigger() with a cancel callback and params', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      const params = { foo: 'bar' };
      mgr.triggerAction('myAction', params);
      expect(action.trigger).toHaveBeenCalledWith(expect.any(Function), params);
    });

    it('emits onActiveActionChange with actionName when forceExecution=false', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction', undefined, false);
      expect(weave.emitEvent).toHaveBeenCalledWith(
        'onActiveActionChange',
        'myAction'
      );
    });

    it('does NOT emit onActiveActionChange when forceExecution=true', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction', undefined, true);
      expect(weave.emitEvent).not.toHaveBeenCalledWith(
        'onActiveActionChange',
        expect.anything()
      );
    });

    it('returns the payload from handler.trigger()', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      const result = mgr.triggerAction('myAction');
      expect(result).toEqual({ result: 'payload' });
    });
  });

  describe('updatePropsAction()', () => {
    it('throws and logs error when action not registered', () => {
      const { weave, logger } = makeMockWeave({});
      const mgr = new WeaveActionsManager(weave);
      expect(() =>
        mgr.updatePropsAction('missing', {} as WeaveElementAttributes)
      ).toThrow('Action handler with name [missing] not registered');
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws and logs error when action is not active', () => {
      const action = makeMockAction();
      const { weave, logger } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      // activeAction is undefined, not 'myAction'
      expect(() =>
        mgr.updatePropsAction('myAction', {} as WeaveElementAttributes)
      ).toThrow('Action handler with name [myAction] not active');
      expect(logger.error).toHaveBeenCalled();
    });

    it('calls handler.updateProps(props) when registered and active', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      const props = { color: 'blue' } as WeaveElementAttributes;
      mgr.updatePropsAction('myAction', props);
      expect(action.updateProps).toHaveBeenCalledWith(props);
    });

    it('does not throw when updateProps is not defined', () => {
      const action = makeMockAction({ updateProps: undefined });
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(() =>
        mgr.updatePropsAction('myAction', {} as WeaveElementAttributes)
      ).not.toThrow();
    });
  });

  describe('getPropsAction()', () => {
    it('throws and logs error when action not registered', () => {
      const { weave, logger } = makeMockWeave({});
      const mgr = new WeaveActionsManager(weave);
      expect(() => mgr.getPropsAction('missing')).toThrow(
        'Action handler with name [missing] not registered'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws and logs error when action is not active', () => {
      const action = makeMockAction();
      const { weave, logger } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      expect(() => mgr.getPropsAction('myAction')).toThrow(
        'Action handler with name [myAction] not active'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns result of handler.getProps()', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      const result = mgr.getPropsAction('myAction');
      expect(result).toEqual({ color: 'red' });
    });

    it('returns undefined when getProps is not defined', () => {
      const action = makeMockAction({ getProps: undefined });
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(mgr.getPropsAction('myAction')).toBeUndefined();
    });
  });

  describe('cancelAction()', () => {
    it('throws and logs error when action not registered', () => {
      const { weave, logger } = makeMockWeave({});
      const mgr = new WeaveActionsManager(weave);
      expect(() => mgr.cancelAction('missing')).toThrow(
        'Action handler with name [missing] not registered'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('sets activeAction to undefined', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(mgr.getActiveAction()).toBe('myAction');
      mgr.cancelAction('myAction');
      expect(mgr.getActiveAction()).toBeUndefined();
    });

    it('calls handler.cleanup() when defined', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      mgr.cancelAction('myAction');
      expect(action.cleanup).toHaveBeenCalled();
    });

    it('does not throw when cleanup is not defined', () => {
      const action = makeMockAction({ cleanup: undefined });
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      expect(() => mgr.cancelAction('myAction')).not.toThrow();
    });

    it('emits onActiveActionChange with undefined', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      vi.clearAllMocks();
      mgr.cancelAction('myAction');
      expect(weave.emitEvent).toHaveBeenCalledWith(
        'onActiveActionChange',
        undefined
      );
    });
  });

  describe('cancelActionCallback()', () => {
    it('returns a function that calls cancelAction(actionName)', () => {
      const action = makeMockAction();
      const { weave } = makeMockWeave({ myAction: action });
      const mgr = new WeaveActionsManager(weave);
      mgr.triggerAction('myAction');
      // The cancel callback is passed to trigger — invoke it directly
      const callback = (action.trigger as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as () => void;
      callback();
      expect(mgr.getActiveAction()).toBeUndefined();
    });
  });
});
