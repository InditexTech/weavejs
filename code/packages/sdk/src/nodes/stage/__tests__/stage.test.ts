// @vitest-environment jsdom
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveStageNode } from '../stage';
import { WEAVE_STAGE_DEFAULT_MODE, WEAVE_STAGE_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import { setupUpscaleStage } from '../../../internal-utils/upscale';

// Break the node.ts ↔ weave.ts circular dependency so WeaveNode is evaluated
// before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// Prevent setupUpscaleStage from reading offsetWidth/offsetHeight (always 0 in
// jsdom), which would produce a degenerate stage size.
vi.mock('@/internal-utils/upscale', () => ({ setupUpscaleStage: vi.fn() }));

// ============================================================================
// Helpers
// ============================================================================

function createMockInstance() {
  const controller = new AbortController();
  const mock = {
    getStage: vi.fn().mockReturnValue(null),
    isServerSide: vi.fn().mockReturnValue(false),
    getEventsController: vi.fn().mockReturnValue(controller),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    getConfiguration: vi.fn().mockReturnValue({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(undefined) as any,
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
  };
  return { mock, controller };
}

function makeStageNode() {
  const node = new WeaveStageNode();
  const { mock, controller } = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock, controller };
}

function defaultProps(container: HTMLDivElement, overrides: Record<string, unknown> = {}) {
  return {
    container,
    width: 300,
    height: 300,
    id: 'stage-id',
    nodeType: WEAVE_STAGE_NODE_TYPE,
    ...overrides,
  };
}

// ============================================================================
// Global setup: install Konva.Node prototype augmentations once
// ============================================================================

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ============================================================================
// Tests
// ============================================================================

describe('WeaveStageNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 nodeType is "stage"', () => {
      const { node } = makeStageNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_STAGE_NODE_TYPE);
    });

    it('1.2 initialize is undefined', () => {
      const { node } = makeStageNode();
      expect(node.initialize).toBeUndefined();
    });

    it('1.3 globalEventsInitialized starts as false', () => {
      const { node } = makeStageNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).globalEventsInitialized).toBe(false);
    });

    it('1.4 stageFocused starts as false', () => {
      const { node } = makeStageNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).stageFocused).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — onRender: stage creation
  // -------------------------------------------------------------------------

  describe('onRender — stage creation', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('2.1 creates a new Konva.Stage when getStage() returns null', () => {
      const { node, mock, controller } = makeStageNode();
      mock.getStage.mockReturnValue(null);
      const stage = node.onRender(defaultProps(container));
      controller.abort();
      expect(stage).toBeInstanceOf(Konva.Stage);
    });

    it('2.2 uses existing stage when getStage() returns one', () => {
      const { node, mock, controller } = makeStageNode();
      const existingStage = new Konva.Stage({ container, width: 300, height: 300 });
      mock.getStage.mockReturnValue(existingStage);
      const result = node.onRender(defaultProps(container));
      controller.abort();
      existingStage.destroy();
      expect(result).toBe(existingStage);
    });

    it('2.3 calls setupUpscaleStage with the instance and the stage', () => {
      const { node, mock, controller } = makeStageNode();
      vi.mocked(setupUpscaleStage).mockClear();
      const stage = node.onRender(defaultProps(container)) as Konva.Stage;
      controller.abort();
      stage.destroy();
      expect(vi.mocked(setupUpscaleStage)).toHaveBeenCalledOnce();
      expect(vi.mocked(setupUpscaleStage)).toHaveBeenCalledWith(mock, stage);
    });

    it('2.4 stage.isFocused() reflects stageFocused', () => {
      const { node, controller } = makeStageNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stage = node.onRender(defaultProps(container)) as any;
      controller.abort();
      expect(stage.isFocused()).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).stageFocused = true;
      expect(stage.isFocused()).toBe(true);
      stage.destroy();
    });

    it('2.5 stage position is set to {x:0, y:0} after render', () => {
      const { node, mock, controller } = makeStageNode();
      const existingStage = new Konva.Stage({ container, width: 300, height: 300 });
      existingStage.position({ x: 50, y: 75 });
      mock.getStage.mockReturnValue(existingStage);
      node.onRender(defaultProps(container));
      controller.abort();
      existingStage.destroy();
      expect(existingStage.x()).toBe(0);
      expect(existingStage.y()).toBe(0);
    });

    it('2.6 returns the Konva.Stage instance', () => {
      const { node, mock, controller } = makeStageNode();
      mock.getStage.mockReturnValue(null);
      const result = node.onRender(defaultProps(container));
      controller.abort();
      expect(result).toBeInstanceOf(Konva.Stage);
      (result as Konva.Stage).destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: DOM setup (client-side vs server-side)
  // -------------------------------------------------------------------------

  describe('onRender — DOM setup', () => {
    let container: HTMLDivElement;
    let node: WeaveStageNode;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;
    let stage: Konva.Stage;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      ({ node, mock, controller } = makeStageNode());
      stage = node.onRender(defaultProps(container)) as Konva.Stage;
      mock.getStage.mockReturnValue(stage);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('3.1 sets tabindex="0" on container when not server-side', () => {
      expect(stage.container().getAttribute('tabindex')).toBe('0');
    });

    it('3.2 focus event on container sets stageFocused to true', () => {
      stage.container().dispatchEvent(new Event('focus'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).stageFocused).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).isFocused()).toBe(true);
    });

    it('3.3 blur event on container sets stageFocused back to false', () => {
      stage.container().dispatchEvent(new Event('focus'));
      stage.container().dispatchEvent(new Event('blur'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).stageFocused).toBe(false);
    });

    it('3.4 skips container setup when server-side', () => {
      const c2 = document.createElement('div');
      document.body.appendChild(c2);
      const { node: n2, mock: m2, controller: ctrl2 } = makeStageNode();
      m2.isServerSide.mockReturnValue(true);
      const s2 = n2.onRender(defaultProps(c2)) as Konva.Stage;
      ctrl2.abort();
      expect(s2.container().getAttribute('tabindex')).toBeNull();
      s2.destroy();
      c2.remove();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: Konva.Stage prototype augmentation
  // -------------------------------------------------------------------------

  describe('onRender — Konva.Stage prototype augmentation', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let controller: AbortController;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
      result.mock.getStage.mockReturnValue(stage);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('4.1 mode() getter returns undefined before first explicit set', () => {
      // A fresh stage before mode() is called for the first time has _mode
      // undefined; only the WEAVE_STAGE_DEFAULT_MODE set at end of onRender
      // is visible here — see test 4.9.
      const freshStage = new Konva.Stage({ container, width: 1, height: 1 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((freshStage as any)._mode).toBeUndefined();
      freshStage.destroy();
    });

    it('4.2 mode(value) setter stores value; mode() returns it', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).mode('custom');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).mode()).toBe('custom');
    });

    it('4.3 allowActions() getter returns undefined before first set', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowActions()).toBeUndefined();
    });

    it('4.4 allowActions(array) setter; getter returns the array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowActions(['action1', 'action2']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowActions()).toEqual(['action1', 'action2']);
    });

    it('4.5 allowSelectNodes() getter returns undefined before first set', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowSelectNodes()).toBeUndefined();
    });

    it('4.6 allowSelectNodes(array) setter; getter returns the array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelectNodes(['rect', 'circle']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowSelectNodes()).toEqual(['rect', 'circle']);
    });

    it('4.7 allowSelection() getter returns undefined before first set', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowSelection()).toBeUndefined();
    });

    it('4.8 allowSelection(bool) setter; getter returns the bool', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelection(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).allowSelection()).toBe(true);
    });

    it('4.9 stage.mode() equals WEAVE_STAGE_DEFAULT_MODE after onRender', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stage as any).mode()).toBe(WEAVE_STAGE_DEFAULT_MODE);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — onRender: handleMouseover / handleMouseout
  // -------------------------------------------------------------------------

  describe('onRender — handleMouseover / handleMouseout', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let controller: AbortController;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('5.1 handleMouseover sets container cursor to "default"', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).handleMouseover();
      expect(stage.container().style.cursor).toBe('default');
    });

    it('5.2 handleMouseout does not throw', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (stage as any).handleMouseout()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — onRender: pointerdown event
  // -------------------------------------------------------------------------

  describe('onRender — pointerdown event', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      mock = result.mock;
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
      mock.getStage.mockReturnValue(stage);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('6.1 sets cursor to "grabbing" when not server-side and moveTool is active', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.fire('pointerdown');
      expect(stage.container().style.cursor).toBe('grabbing');
    });

    it('6.2 does not set cursor when server-side', () => {
      mock.isServerSide.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.container().style.cursor = '';
      stage.fire('pointerdown');
      expect(stage.container().style.cursor).toBe('');
    });

    it('6.3 does not set cursor when active action is not moveTool', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      stage.container().style.cursor = '';
      stage.fire('pointerdown');
      expect(stage.container().style.cursor).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — onRender: pointermove event
  // -------------------------------------------------------------------------

  describe('onRender — pointermove event', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      mock = result.mock;
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
      mock.getStage.mockReturnValue(stage);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    // Helper to seed allow* prototype values before firing pointermove
    function seedAllowValues(
      allowSelection: boolean,
      allowActions: string[],
      allowSelectNodes: string[]
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelection(allowSelection);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowActions(allowActions);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelectNodes(allowSelectNodes);
    }

    // --- First if-block (complex multi-condition cursor = 'default') ---

    it('7.1 skips first block when server-side', () => {
      mock.isServerSide.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');
      seedAllowValues(true, [], []);
      stage.container().style.cursor = '';
      // Use a non-stage target so the second if-block (target===stage) also doesn't fire
      const target = new Konva.Rect();
      stage.fire('pointermove', { target });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.2 skips first block when active action is moveTool', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.container().style.cursor = '';
      stage.fire('pointermove', { target: stage });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.3 skips first block when allowSelection() is false', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      seedAllowValues(false, [], []);
      stage.container().style.cursor = '';
      // Non-stage target prevents the second if-block from firing
      const target = new Konva.Rect();
      stage.fire('pointermove', { target });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.4 skips first block when active action is in allowActions()', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      seedAllowValues(true, ['selectionTool'], []);
      stage.container().style.cursor = '';
      // Non-stage target prevents the second if-block from firing
      const target = new Konva.Rect();
      stage.fire('pointermove', { target });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.5 skips first block when target nodeType is in allowSelectNodes()', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      seedAllowValues(true, [], ['rectangle']);
      stage.container().style.cursor = '';
      const target = new Konva.Rect({ nodeType: 'rectangle' });
      stage.fire('pointermove', { target });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.6 sets cursor to "default" when all first-block conditions pass', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      seedAllowValues(true, [], []);
      const target = new Konva.Rect();
      stage.fire('pointermove', { target });
      expect(stage.container().style.cursor).toBe('default');
    });

    // --- Second if-block (target === stage + selectionTool) ---

    it('7.7 sets cursor to "default" when target is stage and selectionTool is active', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      // Disable first block
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelection(false);
      stage.fire('pointermove', { target: stage });
      expect(stage.container().style.cursor).toBe('default');
    });

    it('7.8 skips second block when target is not the stage', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelection(false);
      stage.container().style.cursor = '';
      const otherTarget = new Konva.Rect();
      stage.fire('pointermove', { target: otherTarget });
      expect(stage.container().style.cursor).toBe('');
    });

    it('7.9 skips second block when active action is not selectionTool', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('someOtherAction');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage as any).allowSelection(false);
      stage.container().style.cursor = '';
      stage.fire('pointermove', { target: stage });
      expect(stage.container().style.cursor).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — onRender: pointerup event
  // -------------------------------------------------------------------------

  describe('onRender — pointerup event', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      mock = result.mock;
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
      mock.getStage.mockReturnValue(stage);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('8.1 sets cursor to "grab" when not server-side and moveTool is active', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.fire('pointerup');
      expect(stage.container().style.cursor).toBe('grab');
    });

    it('8.2 does not set cursor when server-side', () => {
      mock.isServerSide.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.container().style.cursor = '';
      stage.fire('pointerup');
      expect(stage.container().style.cursor).toBe('');
    });

    it('8.3 does not set cursor when active action is not moveTool', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      stage.container().style.cursor = '';
      stage.fire('pointerup');
      expect(stage.container().style.cursor).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — onRender: pointerover event
  // -------------------------------------------------------------------------

  describe('onRender — pointerover event', () => {
    let container: HTMLDivElement;
    let stage: Konva.Stage;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;
    let layer: Konva.Layer;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      const result = makeStageNode();
      mock = result.mock;
      controller = result.controller;
      stage = result.node.onRender(defaultProps(container)) as Konva.Stage;
      mock.getStage.mockReturnValue(stage);
      layer = new Konva.Layer();
      stage.add(layer);
    });

    afterEach(() => {
      controller.abort();
      stage.destroy();
      container.remove();
    });

    it('9.1 early return when moveTool is active — no cursor change', () => {
      mock.getActiveAction.mockReturnValue('moveTool');
      stage.container().style.cursor = '';
      stage.fire('pointerover', { target: stage });
      expect(stage.container().style.cursor).toBe('');
    });

    it('9.2 early return when target is not stage and has no nodeId', () => {
      mock.getActiveAction.mockReturnValue('selectionTool');
      stage.container().style.cursor = '';
      const rect = new Konva.Rect({ id: 'no-nodeId-rect' });
      layer.add(rect);
      stage.fire('pointerover', { target: rect });
      expect(stage.container().style.cursor).toBe('');
    });

    it('9.3 early return when target parent is a Konva.Transformer', () => {
      mock.getActiveAction.mockReturnValue('selectionTool');
      stage.container().style.cursor = '';
      const transformer = new Konva.Transformer();
      layer.add(transformer);
      const rect = new Konva.Rect({ nodeId: 'some-id' });
      transformer.add(rect);
      stage.fire('pointerover', { target: rect });
      expect(stage.container().style.cursor).toBe('');
    });

    it('9.4 sets cursor to "default" when target has nodeId and parent has no "node" name (client-side)', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      // Group without "node" name — cursor should be set
      const group = new Konva.Group({ id: 'group-no-node', name: 'other' });
      layer.add(group);
      const rect = new Konva.Rect({ id: 'child-rect', nodeId: 'group-no-node' });
      layer.add(rect);
      stage.fire('pointerover', { target: rect });
      expect(stage.container().style.cursor).toBe('default');
    });

    it('9.5 no cursor change when parent found by nodeId has "node" name', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      const group = new Konva.Group({ id: 'group-with-node', name: 'node' });
      layer.add(group);
      const rect = new Konva.Rect({ id: 'child-rect2', nodeId: 'group-with-node' });
      layer.add(rect);
      stage.container().style.cursor = '';
      stage.fire('pointerover', { target: rect });
      expect(stage.container().style.cursor).toBe('');
    });

    it('9.6 no cursor change when server-side even if parent has no "node" name', () => {
      mock.isServerSide.mockReturnValue(true);
      mock.getActiveAction.mockReturnValue('selectionTool');
      const group = new Konva.Group({ id: 'group-server', name: 'other' });
      layer.add(group);
      const rect = new Konva.Rect({ id: 'child-rect3', nodeId: 'group-server' });
      layer.add(rect);
      stage.container().style.cursor = '';
      stage.fire('pointerover', { target: rect });
      expect(stage.container().style.cursor).toBe('');
    });

    it('9.7 sets cursor to "default" when target is stage (no nodeId), parent is null, not server-side', () => {
      mock.isServerSide.mockReturnValue(false);
      mock.getActiveAction.mockReturnValue('selectionTool');
      stage.fire('pointerover', { target: stage });
      expect(stage.container().style.cursor).toBe('default');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    it('10.1 onUpdate does not throw', () => {
      const { node } = makeStageNode();
      expect(() => node.onUpdate()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — setupEvents: initialization guards
  // -------------------------------------------------------------------------

  describe('setupEvents — initialization', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('11.1 skips registration when server-side; globalEventsInitialized stays false', () => {
      const { node, mock, controller } = makeStageNode();
      mock.isServerSide.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
      controller.abort();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).globalEventsInitialized).toBe(false);
    });

    it('11.2 sets globalEventsInitialized to true after successful registration', () => {
      const { node, mock, controller } = makeStageNode();
      const stageContainer = { style: {} as CSSStyleDeclaration };
      mock.getStage.mockReturnValue({ container: () => stageContainer });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
      controller.abort();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).globalEventsInitialized).toBe(true);
    });

    it('11.3 calling setupEvents twice is idempotent (already-initialized guard)', () => {
      const { node, mock, controller } = makeStageNode();
      const stageContainer = { style: {} as CSSStyleDeclaration };
      mock.getStage.mockReturnValue({ container: () => stageContainer });
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
      const callsAfterFirst = addEventSpy.mock.calls.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
      // Assert BEFORE mockRestore (which clears the spy's call history)
      expect(addEventSpy.mock.calls.length).toBe(callsAfterFirst);
      addEventSpy.mockRestore();
      controller.abort();
    });

    it('11.4 onRender triggers setupEvents (globalEventsInitialized is true after render)', () => {
      const { node, mock, controller } = makeStageNode();
      mock.getStage.mockReturnValue(null);
      const s = node.onRender(defaultProps(container)) as Konva.Stage;
      controller.abort();
      s.destroy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).globalEventsInitialized).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — keydown handler + isOnlyCtrlOrMeta branches
  // -------------------------------------------------------------------------

  describe('keydown handler', () => {
    let container: HTMLDivElement;
    let node: WeaveStageNode;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;
    let stageContainer: { style: Record<string, string> };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      ({ node, mock, controller } = makeStageNode());
      stageContainer = { style: {} };
      mock.getStage.mockReturnValue({ container: () => stageContainer });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
    });

    afterEach(() => {
      controller.abort();
      container.remove();
    });

    it('12.1 no action when neither ctrl nor meta is pressed', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: false, metaKey: false }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('12.2 no action when ctrlKey + shiftKey (noOtherModifiers = false)', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true, shiftKey: true }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('12.3 no action when ctrlKey + altKey (noOtherModifiers = false)', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true, altKey: true }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('12.4 no action when ctrlKey pressed but key is not "Control" or "Meta"', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, shiftKey: false, altKey: false }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('12.5 isOnlyCtrlOrMeta true (ctrl+Control): sets cursor to "default"; returns when transformer is null', () => {
      mock.getPlugin.mockReturnValue(undefined);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
      expect(stageContainer.style.cursor).toBe('default');
    });

    it('12.6 isOnlyCtrlOrMeta true (meta+Meta): sets cursor; no fire when transformer has 0 nodes', () => {
      const transformer = new Konva.Transformer();
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
      expect(stageContainer.style.cursor).toBe('default');
    });

    it('12.7 no fire when transformer has more than 1 node', () => {
      const transformer = new Konva.Transformer();
      const r1 = new Konva.Rect();
      const r2 = new Konva.Rect();
      transformer.nodes([r1, r2]);
      const fireSpy1 = vi.spyOn(r1, 'fire');
      const fireSpy2 = vi.spyOn(r2, 'fire');
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
      expect(fireSpy1).not.toHaveBeenCalledWith('onCmdCtrlPressed');
      expect(fireSpy2).not.toHaveBeenCalledWith('onCmdCtrlPressed');
    });

    it('12.8 fires "onCmdCtrlPressed" on single selected node when isOnlyCtrlOrMeta is true', () => {
      const transformer = new Konva.Transformer();
      const selectedRect = new Konva.Rect();
      transformer.nodes([selectedRect]);
      const fireSpy = vi.spyOn(selectedRect, 'fire');
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
      expect(fireSpy).toHaveBeenCalledWith('onCmdCtrlPressed');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — keyup handler
  // -------------------------------------------------------------------------

  describe('keyup handler', () => {
    let container: HTMLDivElement;
    let node: WeaveStageNode;
    let mock: ReturnType<typeof createMockInstance>['mock'];
    let controller: AbortController;
    let stageContainer: { style: Record<string, string> };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      ({ node, mock, controller } = makeStageNode());
      stageContainer = { style: {} };
      mock.getStage.mockReturnValue({ container: () => stageContainer });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).setupEvents();
    });

    afterEach(() => {
      controller.abort();
      container.remove();
    });

    it('13.1 no action when ctrlKey is true (condition !(ctrl||meta) is false)', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: true }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('13.2 no action when metaKey is true', () => {
      stageContainer.style.cursor = '';
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: true }));
      expect(stageContainer.style.cursor).toBe('');
    });

    it('13.3 sets cursor to "default" and returns early when transformer is null', () => {
      mock.getPlugin.mockReturnValue(undefined);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: false, metaKey: false }));
      expect(stageContainer.style.cursor).toBe('default');
    });

    it('13.4 sets cursor to "default" and does not fire when transformer has 0 nodes', () => {
      const transformer = new Konva.Transformer();
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      expect(stageContainer.style.cursor).toBe('default');
    });

    it('13.5 does not fire when transformer has more than 1 node', () => {
      const transformer = new Konva.Transformer();
      const r1 = new Konva.Rect();
      const r2 = new Konva.Rect();
      transformer.nodes([r1, r2]);
      const fireSpy1 = vi.spyOn(r1, 'fire');
      const fireSpy2 = vi.spyOn(r2, 'fire');
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      expect(fireSpy1).not.toHaveBeenCalledWith('onCmdCtrlReleased');
      expect(fireSpy2).not.toHaveBeenCalledWith('onCmdCtrlReleased');
    });

    it('13.6 fires "onCmdCtrlReleased" on single selected node when no ctrl/meta on keyup', () => {
      const transformer = new Konva.Transformer();
      const selectedRect = new Konva.Rect();
      transformer.nodes([selectedRect]);
      const fireSpy = vi.spyOn(selectedRect, 'fire');
      mock.getPlugin.mockReturnValue({
        getTransformer: vi.fn().mockReturnValue(transformer),
        getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
      });
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: false, metaKey: false }));
      expect(fireSpy).toHaveBeenCalledWith('onCmdCtrlReleased');
    });
  });
});
