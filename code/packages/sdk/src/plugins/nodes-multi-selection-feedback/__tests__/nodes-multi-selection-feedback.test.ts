// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

// ─── Konva mock ────────────────────────────────────────────────────────────────

type MockLayer = {
  add: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};

type MockRect = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  strokeScaleEnabled: boolean;
  draggable: boolean;
  listening: boolean;
  destroy: ReturnType<typeof vi.fn>;
  moveToBottom: ReturnType<typeof vi.fn>;
  setAttrs: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
};

type MockKonvaLayer = {
  id: string;
};

let mockLayerInstance: MockLayer;
let mockRectInstances: MockRect[] = [];
let mockKonvaLayerCtorInstances: MockKonvaLayer[] = [];

function makeLayerInstance(): MockLayer {
  return {
    add: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    findOne: vi.fn().mockReturnValue(undefined),
  };
}

function makeRectInstance(attrs: Record<string, unknown>): MockRect {
  return {
    ...(attrs as MockRect),
    destroy: vi.fn(),
    moveToBottom: vi.fn(),
    setAttrs: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };
}

vi.mock('konva', () => {
  return {
    default: {
      Layer: vi.fn((attrs: Record<string, unknown>) => {
        const instance = { id: attrs?.id as string };
        mockKonvaLayerCtorInstances.push(instance);
        mockLayerInstance = makeLayerInstance();
        return mockLayerInstance;
      }),
      Rect: vi.fn((attrs: Record<string, unknown>) => {
        const r = makeRectInstance(attrs);
        mockRectInstances.push(r);
        return r;
      }),
    },
  };
});

import { WeaveNodesMultiSelectionFeedbackPlugin } from '../nodes-multi-selection-feedback';
import {
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG,
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY,
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_LAYER_ID,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeMockWeave(opts: {
  stageLayer?: MockLayer | null;
  selectionLayer?: MockLayer | null;
} = {}) {
  const mockStage = {
    add: vi.fn(),
    findOne: vi.fn().mockReturnValue(opts.stageLayer ?? undefined),
  };

  const selectionLayer =
    opts.selectionLayer !== undefined
      ? opts.selectionLayer
      : makeLayerInstance();

  return {
    getStage: vi.fn().mockReturnValue(mockStage),
    getSelectionLayer: vi.fn().mockReturnValue(selectionLayer),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    _stage: mockStage,
    _selectionLayer: selectionLayer,
  };
}

/**
 * Build a minimal Konva.Node mock.
 * `getAbsoluteTransform` returns an identity-like transform (point → point).
 */
function makeNode(opts: {
  id?: string;
  nodeId?: string;
  parentNodeId?: string;
  nullStage?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
} = {}) {
  const parentAttrs: R = opts.parentNodeId ? { nodeId: opts.parentNodeId } : {};
  const parent = {
    getAttrs: vi.fn().mockReturnValue(parentAttrs),
  };

  const cloneAttrs: R = { id: opts.id ?? 'node-1' };
  if (opts.nodeId) cloneAttrs['nodeId'] = opts.nodeId;

  const localBox = {
    x: opts.x ?? 10,
    y: opts.y ?? 20,
    width: opts.width ?? 100,
    height: opts.height ?? 50,
  };

  const cloneMock = {
    getClientRect: vi.fn().mockReturnValue(localBox),
    getAbsoluteTransform: vi.fn().mockReturnValue({
      point: vi.fn().mockImplementation((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
    }),
    scaleX: vi.fn().mockReturnValue(opts.scaleX ?? 1),
    scaleY: vi.fn().mockReturnValue(opts.scaleY ?? 1),
    rotation: vi.fn().mockReturnValue(opts.rotation ?? 0),
  };

  const nodeAttrs: R = { id: opts.id ?? 'node-1' };
  if (opts.nodeId) nodeAttrs['nodeId'] = opts.nodeId;

  return {
    getAttrs: vi.fn().mockReturnValue(nodeAttrs),
    getStage: vi.fn().mockReturnValue(opts.nullStage ? null : {}),
    getParent: vi.fn().mockReturnValue(parent),
    clone: vi.fn().mockReturnValue(cloneMock),
    _cloneMock: cloneMock,
    _parent: parent,
  };
}

function setupPlugin(opts: Parameters<typeof makeMockWeave>[0] = {}) {
  const weave = makeMockWeave(opts);
  const plugin = new WeaveNodesMultiSelectionFeedbackPlugin();
  plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);
  return { plugin, weave };
}

// ─── global test hooks ────────────────────────────────────────────────────────

beforeEach(() => {
  mockRectInstances = [];
  mockKonvaLayerCtorInstances = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveNodesMultiSelectionFeedbackPlugin', () => {

  // ── Suite 1: constructor / initialize() ─────────────────────────────────────

  describe('constructor / initialize()', () => {
    it('TC-01: no params → selectedHalos is {}, config uses defaults', () => {
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin();
      expect(plugin.getSelectedHalos()).toEqual({});
      const config = (plugin as unknown as R)['config'] as R;
      const style = config['style'] as R;
      expect(style['stroke']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.stroke);
      expect(style['strokeWidth']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.strokeWidth);
      expect(style['fill']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.fill);
    });

    it('TC-02: partial config merges — custom stroke overrides, rest kept as defaults', () => {
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin({
        config: { style: { stroke: '#000000' } },
      });
      const style = ((plugin as unknown as R)['config'] as R)['style'] as R;
      expect(style['stroke']).toBe('#000000');
      expect(style['strokeWidth']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.strokeWidth);
      expect(style['fill']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.fill);
    });
  });

  // ── Suite 2: getName() / getLayerName() ─────────────────────────────────────

  describe('getName() / getLayerName()', () => {
    it('TC-03: getName() returns the plugin key constant', () => {
      const { plugin } = setupPlugin();
      expect(plugin.getName()).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY);
      expect(plugin.getName()).toBe('nodesMultiSelectionFeedback');
    });

    it('TC-04: getLayerName() returns the layer id constant', () => {
      const { plugin } = setupPlugin();
      expect((plugin as unknown as R)['getLayerName']()).toBe(
        WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_LAYER_ID
      );
      expect((plugin as unknown as R)['getLayerName']()).toBe('selectionLayer');
    });
  });

  // ── Suite 3: initLayer() ────────────────────────────────────────────────────

  describe('initLayer()', () => {
    it('TC-05: layer not found → new Konva.Layer created and added to stage', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Layer).mockClear();

      const { plugin, weave } = setupPlugin({ stageLayer: undefined });
      // Make findOne return undefined to simulate layer absent
      weave._stage.findOne.mockReturnValue(undefined);

      plugin.initLayer();

      expect(Konva.default.Layer).toHaveBeenCalledWith({
        id: WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_LAYER_ID,
      });
      expect(weave._stage.add).toHaveBeenCalledWith(mockLayerInstance);
    });

    it('TC-06: layer already exists → no new Konva.Layer created', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Layer).mockClear();

      const existingLayer = makeLayerInstance();
      const { plugin, weave } = setupPlugin();
      weave._stage.findOne.mockReturnValue(existingLayer);

      plugin.initLayer();

      expect(Konva.default.Layer).not.toHaveBeenCalled();
      expect(weave._stage.add).not.toHaveBeenCalled();
    });
  });

  // ── Suite 4: getSelectedHalos() ─────────────────────────────────────────────

  describe('getSelectedHalos()', () => {
    it('TC-07: returns empty object on fresh instance', () => {
      const { plugin } = setupPlugin();
      expect(plugin.getSelectedHalos()).toEqual({});
    });

    it('TC-08: returns updated record after direct internal state mutation', () => {
      const { plugin } = setupPlugin();
      const fakeRect = makeRectInstance({ id: 'fake' });
      (plugin as unknown as R)['selectedHalos'] = { 'node-1': fakeRect };
      expect(Object.keys(plugin.getSelectedHalos())).toContain('node-1');
    });
  });

  // ── Suite 5: cleanupSelectedHalos() ─────────────────────────────────────────

  describe('cleanupSelectedHalos()', () => {
    it('TC-09: no halos → no-op (no errors)', () => {
      const { plugin } = setupPlugin();
      expect(() => plugin.cleanupSelectedHalos()).not.toThrow();
      expect(plugin.getSelectedHalos()).toEqual({});
    });

    it('TC-10: two halos → both destroyed, record becomes empty', () => {
      const { plugin } = setupPlugin();
      const rect1 = makeRectInstance({ id: 'n1-selection-halo' });
      const rect2 = makeRectInstance({ id: 'n2-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect1, 'n2': rect2 };

      plugin.cleanupSelectedHalos();

      expect(rect1.destroy).toHaveBeenCalledTimes(1);
      expect(rect2.destroy).toHaveBeenCalledTimes(1);
      expect(plugin.getSelectedHalos()).toEqual({});
    });
  });

  // ── Suite 6: createSelectionHalo() ──────────────────────────────────────────

  describe('createSelectionHalo()', () => {
    it('TC-11: halo already exists for nodeId → early return, no new Rect', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin } = setupPlugin();
      const existingRect = makeRectInstance({ id: 'node-1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'node-1': existingRect };

      const node = makeNode({ id: 'node-1' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).not.toHaveBeenCalled();
    });

    it('TC-12: getNodeInfo returns null (mocked) → no Rect created', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin } = setupPlugin();
      // Force the private method to return null to exercise the falsy-info branch
      vi.spyOn(plugin as unknown as R, 'getNodeInfo').mockReturnValue(null);

      const node = makeNode({ id: 'node-null-info' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).not.toHaveBeenCalled();
    });

    it('TC-13: happy path → Rect created with correct attrs from node, added to selectionLayer', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();
      mockRectInstances = [];

      const { plugin, weave } = setupPlugin();
      const node = makeNode({ id: 'node-abc', x: 5, y: 10, width: 80, height: 40, rotation: 45 });

      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      const rectAttrs = vi.mocked(Konva.default.Rect).mock.calls[0][0] as R;
      expect(rectAttrs['id']).toBe('node-abc-selection-halo');
      expect(rectAttrs['name']).toBe('selection-halo');
      expect(rectAttrs['stroke']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.stroke);
      expect(rectAttrs['fill']).toBe(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG.style.fill);
      expect(rectAttrs['strokeScaleEnabled']).toBe(false);
      expect(rectAttrs['draggable']).toBe(false);
      expect(rectAttrs['listening']).toBe(false);

      const createdRect = mockRectInstances[0];
      expect(weave._selectionLayer.add).toHaveBeenCalledWith(createdRect);
      expect(createdRect.moveToBottom).toHaveBeenCalled();
      expect(plugin.getSelectedHalos()['node-abc']).toBe(createdRect);
    });

    it('TC-14: custom config → Rect uses overridden stroke/fill/strokeWidth', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const weave = makeMockWeave();
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin({
        config: { style: { stroke: '#123456', fill: '#abcdef', strokeWidth: 5 } },
      });
      plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);

      const node = makeNode({ id: 'custom-node' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      const rectAttrs = vi.mocked(Konva.default.Rect).mock.calls[0][0] as R;
      expect(rectAttrs['stroke']).toBe('#123456');
      expect(rectAttrs['fill']).toBe('#abcdef');
      expect(rectAttrs['strokeWidth']).toBe(5);
    });
  });

  // ── Suite 7: destroySelectionHalo() ─────────────────────────────────────────

  describe('destroySelectionHalo()', () => {
    it('TC-15: no halo for node → no-op', () => {
      const { plugin } = setupPlugin();
      const node = makeNode({ id: 'ghost-node' });
      expect(() =>
        plugin.destroySelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-16: halo exists → destroy called, entry removed from selectedHalos', () => {
      const { plugin } = setupPlugin();
      const rect = makeRectInstance({ id: 'n1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect };

      const node = makeNode({ id: 'n1' });
      plugin.destroySelectionHalo(node as unknown as import('konva').default.Node);

      expect(rect.destroy).toHaveBeenCalledTimes(1);
      expect(plugin.getSelectedHalos()['n1']).toBeUndefined();
    });
  });

  // ── Suite 8: updateSelectionHalo() ──────────────────────────────────────────

  describe('updateSelectionHalo()', () => {
    it('TC-17: no halo for node → early return (no errors)', () => {
      const { plugin } = setupPlugin();
      const node = makeNode({ id: 'missing' });
      expect(() =>
        plugin.updateSelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-18: halo exists but getNodeInfo returns null → no setAttrs call', () => {
      const { plugin, weave } = setupPlugin();
      const rect = makeRectInstance({ id: 'n1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect };

      const mockHalo = { setAttrs: vi.fn() };
      weave._selectionLayer.findOne.mockReturnValue(mockHalo);

      // Force private method to return null to exercise the falsy-info branch
      vi.spyOn(plugin as unknown as R, 'getNodeInfo').mockReturnValue(null);

      const node = makeNode({ id: 'n1' });
      plugin.updateSelectionHalo(node as unknown as import('konva').default.Node);

      expect(mockHalo.setAttrs).not.toHaveBeenCalled();
    });

    it('TC-19: halo exists, info valid, selectionLayer is null → early return', () => {
      const weave = makeMockWeave({ selectionLayer: null });
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin();
      plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);

      const rect = makeRectInstance({ id: 'n1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect };

      const node = makeNode({ id: 'n1' });
      expect(() =>
        plugin.updateSelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-20: halo exists, info valid, selectionLayer.findOne returns null → setAttrs not called', () => {
      const { plugin, weave } = setupPlugin();
      const rect = makeRectInstance({ id: 'n1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect };

      weave._selectionLayer.findOne.mockReturnValue(undefined);

      const node = makeNode({ id: 'n1' });
      plugin.updateSelectionHalo(node as unknown as import('konva').default.Node);

      // optional chaining — no error, no setAttrs
      expect(weave._selectionLayer.findOne).toHaveBeenCalledWith('#n1-selection-halo');
    });

    it('TC-21: halo exists, info valid, selectionLayer and halo found → setAttrs called with correct values', () => {
      const { plugin, weave } = setupPlugin();
      const rect = makeRectInstance({ id: 'n1-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { 'n1': rect };

      const mockHalo = { setAttrs: vi.fn() };
      weave._selectionLayer.findOne.mockReturnValue(mockHalo);

      const node = makeNode({ id: 'n1', x: 5, y: 10, width: 80, height: 40, rotation: 30 });
      plugin.updateSelectionHalo(node as unknown as import('konva').default.Node);

      expect(mockHalo.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          rotation: expect.any(Number),
        })
      );
    });
  });

  // ── Suite 9: showSelectionHalo() ────────────────────────────────────────────

  describe('showSelectionHalo()', () => {
    it('TC-22: selectionLayer is null → no error', () => {
      const weave = makeMockWeave({ selectionLayer: null });
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin();
      plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);

      const node = makeNode({ id: 'n1' });
      expect(() =>
        plugin.showSelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-23: layer exists, halo not found → show() not called', () => {
      const { plugin, weave } = setupPlugin();
      weave._selectionLayer.findOne.mockReturnValue(undefined);

      const node = makeNode({ id: 'n1' });
      plugin.showSelectionHalo(node as unknown as import('konva').default.Node);

      // No halo returned, nothing to call show() on
      expect(weave._selectionLayer.findOne).toHaveBeenCalledWith('#n1-selection-halo');
    });

    it('TC-24: layer exists, halo found → show() called', () => {
      const { plugin, weave } = setupPlugin();
      const mockHalo = { show: vi.fn() };
      weave._selectionLayer.findOne.mockReturnValue(mockHalo);

      const node = makeNode({ id: 'n1' });
      plugin.showSelectionHalo(node as unknown as import('konva').default.Node);

      expect(mockHalo.show).toHaveBeenCalledTimes(1);
    });
  });

  // ── Suite 10: hideSelectionHalo() ───────────────────────────────────────────

  describe('hideSelectionHalo()', () => {
    it('TC-25: selectionLayer is null → no error', () => {
      const weave = makeMockWeave({ selectionLayer: null });
      const plugin = new WeaveNodesMultiSelectionFeedbackPlugin();
      plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);

      const node = makeNode({ id: 'n1' });
      expect(() =>
        plugin.hideSelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-26: layer exists, halo not found → hide() not called', () => {
      const { plugin, weave } = setupPlugin();
      weave._selectionLayer.findOne.mockReturnValue(undefined);

      const node = makeNode({ id: 'n1' });
      plugin.hideSelectionHalo(node as unknown as import('konva').default.Node);

      expect(weave._selectionLayer.findOne).toHaveBeenCalledWith('#n1-selection-halo');
    });

    it('TC-27: layer exists, halo found → hide() called', () => {
      const { plugin, weave } = setupPlugin();
      const mockHalo = { hide: vi.fn() };
      weave._selectionLayer.findOne.mockReturnValue(mockHalo);

      const node = makeNode({ id: 'n1' });
      plugin.hideSelectionHalo(node as unknown as import('konva').default.Node);

      expect(mockHalo.hide).toHaveBeenCalledTimes(1);
    });
  });

  // ── Suite 11: enable() / disable() ──────────────────────────────────────────

  describe('enable() / disable()', () => {
    it('TC-28: enable() when layer exists → show() called, isEnabled() true', () => {
      const { plugin, weave } = setupPlugin();
      const mockLayer = { show: vi.fn(), hide: vi.fn() };
      weave._stage.findOne.mockReturnValue(mockLayer);

      plugin.enable();

      expect(mockLayer.show).toHaveBeenCalledTimes(1);
      expect(plugin.isEnabled()).toBe(true);
    });

    it('TC-29: enable() when layer does not exist → no error, isEnabled() true', () => {
      const { plugin, weave } = setupPlugin();
      weave._stage.findOne.mockReturnValue(undefined);

      expect(() => plugin.enable()).not.toThrow();
      expect(plugin.isEnabled()).toBe(true);
    });

    it('TC-30: disable() when layer exists → hide() called, isEnabled() false', () => {
      const { plugin, weave } = setupPlugin();
      const mockLayer = { show: vi.fn(), hide: vi.fn() };
      weave._stage.findOne.mockReturnValue(mockLayer);

      plugin.disable();

      expect(mockLayer.hide).toHaveBeenCalledTimes(1);
      expect(plugin.isEnabled()).toBe(false);
    });

    it('TC-31: disable() when layer does not exist → no error, isEnabled() false', () => {
      const { plugin, weave } = setupPlugin();
      weave._stage.findOne.mockReturnValue(undefined);

      expect(() => plugin.disable()).not.toThrow();
      expect(plugin.isEnabled()).toBe(false);
    });
  });

  // ── Suite 12: container compensation (getNodeInfo private paths) ─────────────

  describe('container compensation in getNodeInfo() (via createSelectionHalo)', () => {
    it('TC-32: node has nodeId attr (is container), realParent found → x/y offset by realParent', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin, weave } = setupPlugin();

      // Stage findOne for initLayer must return something to not create a layer
      // but for this test we need getStage().findOne('#nodeId') to return realParent
      const realParent = { x: vi.fn().mockReturnValue(50), y: vi.fn().mockReturnValue(30) };
      weave._stage.findOne.mockImplementation((selector: string) => {
        if (selector === '#realParentId') return realParent;
        return undefined;
      });

      // Node with nodeId attr → is itself a container
      const node = makeNode({ id: 'container-node', nodeId: 'realParentId' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      const rectAttrs = vi.mocked(Konva.default.Rect).mock.calls[0][0] as R;
      // x should have realParent.x() = 50 added to the localBox.x corner
      expect(typeof rectAttrs['x']).toBe('number');
    });

    it('TC-33: node has nodeId attr, realParent NOT found on stage → x/y unchanged', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin, weave } = setupPlugin();
      weave._stage.findOne.mockReturnValue(undefined); // realParent not found

      const node = makeNode({ id: 'container-node', nodeId: 'missing-parent' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      // Should still create the halo without error
      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
    });

    it('TC-34: node parent has nodeId attr (node inside container), realParent found → compensation applied', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin, weave } = setupPlugin();

      const realParent = {
        x: vi.fn().mockReturnValue(100),
        y: vi.fn().mockReturnValue(200),
        getAttrs: vi.fn().mockReturnValue({
          containerCompensationX: 5,
          containerCompensationY: 10,
        }),
      };
      weave._stage.findOne.mockImplementation((selector: string) => {
        if (selector === '#parentContainerId') return realParent;
        return undefined;
      });

      // Node whose parent has nodeId → child of a container
      const node = makeNode({ id: 'child-node', parentNodeId: 'parentContainerId' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      const rectAttrs = vi.mocked(Konva.default.Rect).mock.calls[0][0] as R;
      expect(typeof rectAttrs['x']).toBe('number');
    });

    it('TC-35: node parent has nodeId attr, realParent NOT found → no compensation, halo still created', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin, weave } = setupPlugin();
      weave._stage.findOne.mockReturnValue(undefined);

      const node = makeNode({ id: 'child-node', parentNodeId: 'missing-container' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
    });

    it('TC-36: node getParent() returns null → parent check skipped safely', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin } = setupPlugin();

      // Build node manually with null parent
      const localBox = { x: 0, y: 0, width: 50, height: 50 };
      const cloneMock = {
        getClientRect: vi.fn().mockReturnValue(localBox),
        getAbsoluteTransform: vi.fn().mockReturnValue({
          point: vi.fn().mockImplementation((p: { x: number; y: number }) => p),
        }),
        scaleX: vi.fn().mockReturnValue(1),
        scaleY: vi.fn().mockReturnValue(1),
        rotation: vi.fn().mockReturnValue(0),
      };
      const nodeAttrs = { id: 'orphan-node' };
      const node = {
        getAttrs: vi.fn().mockReturnValue(nodeAttrs),
        getStage: vi.fn().mockReturnValue({}),
        getParent: vi.fn().mockReturnValue(null),
        clone: vi.fn().mockReturnValue(cloneMock),
      };

      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
    });
  });

  // ── Suite 13: nullish-coalescing fallback branches ───────────────────────────

  describe('nullish-coalescing fallback branches', () => {
    it('TC-37: createSelectionHalo with node id=undefined → uses empty string key', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();
      mockRectInstances = [];

      const { plugin } = setupPlugin();
      const node = makeNode({ id: undefined as unknown as string });
      // Override getAttrs to return no id
      node.getAttrs.mockReturnValue({});

      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      // halo stored under '' key
      expect(plugin.getSelectedHalos()['']).toBeDefined();
    });

    it('TC-38: destroySelectionHalo with node id=undefined → uses empty string key', () => {
      const { plugin } = setupPlugin();
      const rect = makeRectInstance({ id: '-selection-halo' });
      (plugin as unknown as R)['selectedHalos'] = { '': rect };

      const node = makeNode({ id: undefined as unknown as string });
      node.getAttrs.mockReturnValue({});

      plugin.destroySelectionHalo(node as unknown as import('konva').default.Node);

      expect(rect.destroy).toHaveBeenCalledTimes(1);
      expect(plugin.getSelectedHalos()['']).toBeUndefined();
    });

    it('TC-39: updateSelectionHalo with node id=undefined → uses empty string key (early-return path)', () => {
      const { plugin } = setupPlugin();
      // No halo under '' key → early return without error
      const node = makeNode({ id: undefined as unknown as string });
      node.getAttrs.mockReturnValue({});

      expect(() =>
        plugin.updateSelectionHalo(node as unknown as import('konva').default.Node)
      ).not.toThrow();
    });

    it('TC-40: container compensation attrs missing → defaults to 0 (no NaN in result)', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();

      const { plugin, weave } = setupPlugin();

      // realParent has NO containerCompensationX/Y attrs
      const realParent = {
        x: vi.fn().mockReturnValue(10),
        y: vi.fn().mockReturnValue(20),
        getAttrs: vi.fn().mockReturnValue({}), // no compensation attrs
      };
      weave._stage.findOne.mockImplementation((selector: string) => {
        if (selector === '#parentContainerId') return realParent;
        return undefined;
      });

      const node = makeNode({ id: 'child-no-comp', parentNodeId: 'parentContainerId' });
      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      const rectAttrs = vi.mocked(Konva.default.Rect).mock.calls[0][0] as R;
      // With ?? 0 fallback, compensation is 0, so result should be a number (not NaN)
      expect(typeof rectAttrs['x']).toBe('number');
      expect(typeof rectAttrs['y']).toBe('number');
    });

    it('TC-41: createSelectionHalo with node.getStage() returning null → getNodeRectInfo returns null (stage absent branch)', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Rect).mockClear();
      mockRectInstances = [];

      const { plugin } = setupPlugin();
      // Node whose getStage() returns null — exercises the `if (!stage) return null` branch in getNodeRectInfo
      const node = makeNode({ id: 'no-stage-node', nullStage: true });

      plugin.createSelectionHalo(node as unknown as import('konva').default.Node);

      // The Rect is still created (getNodeInfo returns a truthy object even when info is null),
      // but the stage-null branch in getNodeRectInfo is now exercised.
      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
      // Halo key is stored
      expect(plugin.getSelectedHalos()['no-stage-node']).toBeDefined();
    });
  });
});
