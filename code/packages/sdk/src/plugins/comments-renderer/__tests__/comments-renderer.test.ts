// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

// Konva.Layer mock — instances captured for assertion
type MockLayer = {
  add: ReturnType<typeof vi.fn>;
  setZIndex: ReturnType<typeof vi.fn>;
  getZIndex: ReturnType<typeof vi.fn>;
  destroyChildren: ReturnType<typeof vi.fn>;
};

let mockLayerInstances: MockLayer[] = [];

vi.mock('konva', () => ({
  default: {
    Layer: vi.fn(() => {
      const instance: MockLayer = {
        add: vi.fn(),
        setZIndex: vi.fn(),
        getZIndex: vi.fn().mockReturnValue(5),
        destroyChildren: vi.fn(),
      };
      mockLayerInstances.push(instance);
      return instance;
    }),
  },
}));

import { WeaveCommentsRendererPlugin } from '../comments-renderer';
import { WEAVE_COMMENTS_RENDERER_KEY } from '../constants';
import { WEAVE_COMMENT_STATUS } from '@/nodes/comment/constants';
import Konva from 'konva';

// ─── helpers ──────────────────────────────────────────────────────────────────

type C = { id: string; status: string; x: number; y: number; user: object };

function makeConfig() {
  return {
    model: {
      getId: vi.fn((c: C) => c.id),
      getUser: vi.fn((c: C) => c.user),
      getPosition: vi.fn((c: C) => ({ x: c.x, y: c.y })),
      getStatus: vi.fn((c: C) => c.status),
    },
    getUserBackgroundColor: vi.fn().mockReturnValue('#fff'),
    getUserForegroundColor: vi.fn().mockReturnValue('#000'),
  };
}

function makeGroup() {
  return { moveToBottom: vi.fn(), moveToTop: vi.fn() };
}

function makeNodeHandler(group = makeGroup()) {
  return { onRender: vi.fn().mockReturnValue(group), onUpdate: vi.fn() };
}

function makeExistingLayer(): MockLayer {
  return {
    add: vi.fn(),
    setZIndex: vi.fn(),
    getZIndex: vi.fn().mockReturnValue(5),
    destroyChildren: vi.fn(),
  };
}

function makeStage(existingLayer?: object) {
  return {
    add: vi.fn(),
    findOne: vi.fn().mockReturnValue(existingLayer),
  };
}

function makeWeave(opts: {
  stage?: ReturnType<typeof makeStage>;
  selectionLayer?: object | undefined;
  nodeHandler?: object | undefined;
} = {}) {
  const stage = opts.stage ?? makeStage();
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getSelectionLayer: vi.fn().mockReturnValue(opts.selectionLayer),
    getNodeHandler: vi.fn().mockReturnValue(opts.nodeHandler),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  };
}

function makePlugin(opts: {
  selectionLayer?: object;
  nodeHandler?: object;
  existingLayer?: object;
} = {}) {
  const stage = makeStage(opts.existingLayer);
  const weave = makeWeave({
    stage,
    selectionLayer: opts.selectionLayer,
    nodeHandler: opts.nodeHandler,
  });
  const config = makeConfig();
  const plugin = new WeaveCommentsRendererPlugin<C>({ config });
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;
  return { plugin, weave, stage, config };
}

function resolvedComment(id = 'c1'): C {
  return { id, status: WEAVE_COMMENT_STATUS.RESOLVED, x: 10, y: 20, user: { id: 'u1' } };
}

function pendingComment(id = 'c2'): C {
  return { id, status: WEAVE_COMMENT_STATUS.PENDING, x: 30, y: 40, user: { id: 'u2' } };
}

// ─── Suite 1: constructor + initialize() + getName() + static fields ──────────

describe('WeaveCommentsRendererPlugin - constructor + initialize() + statics', () => {
  beforeEach(() => { mockLayerInstances = []; });

  it('1.1 constructor stores config', () => {
    const config = makeConfig();
    const plugin = new WeaveCommentsRendererPlugin<C>({ config });
    // @ts-expect-error — accessing private config for test assertions
    expect(plugin.config).toBe(config);
  });

  it('1.2 initialize() resets comments to empty array', () => {
    const { plugin } = makePlugin();
    plugin.setComments([resolvedComment()]);
    plugin.initialize();
    // @ts-expect-error — accessing private comments for test assertions
    expect(plugin.comments).toEqual([]);
  });

  it('1.3 getName() returns correct key', () => {
    const { plugin } = makePlugin();
    expect(plugin.getName()).toBe(WEAVE_COMMENTS_RENDERER_KEY);
  });

  it('1.4 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = makePlugin();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 2: setComments() ───────────────────────────────────────────────────

describe('WeaveCommentsRendererPlugin - setComments()', () => {
  it('2.1 setComments stores the comments array', () => {
    const { plugin } = makePlugin();
    const comments = [resolvedComment(), pendingComment()];
    plugin.setComments(comments);
    // @ts-expect-error — accessing private comments for test assertions
    expect(plugin.comments).toBe(comments);
  });
});

// ─── Suite 3: getCommentsLayer() ──────────────────────────────────────────────

describe('WeaveCommentsRendererPlugin - getCommentsLayer()', () => {
  beforeEach(() => { mockLayerInstances = []; vi.clearAllMocks(); });

  it('3.1 layer not found → initCommentsLayer() called, new Konva.Layer returned', () => {
    const { plugin, stage } = makePlugin(); // findOne returns undefined by default
    const layer = plugin.getCommentsLayer();
    expect(stage.findOne).toHaveBeenCalled();
    expect(Konva.Layer).toHaveBeenCalled();
    expect(layer).toBe(mockLayerInstances[0]);
  });

  it('3.2 layer found → returns existing layer, no new Konva.Layer created', () => {
    const existing = makeExistingLayer();
    const { plugin } = makePlugin({ existingLayer: existing });
    const layer = plugin.getCommentsLayer();
    expect(layer).toBe(existing);
    expect(Konva.Layer).not.toHaveBeenCalled();
  });
});

// ─── Suite 4: initCommentsLayer() — selectionLayer present / absent ───────────

describe('WeaveCommentsRendererPlugin - initCommentsLayer() via getCommentsLayer()', () => {
  beforeEach(() => { mockLayerInstances = []; vi.clearAllMocks(); });

  it('4.1 selectionLayer present → new layer setZIndex called with selectionZIndex + 1', () => {
    const selectionLayer = { getZIndex: vi.fn().mockReturnValue(5) };
    const { plugin } = makePlugin({ selectionLayer }); // findOne returns undefined
    plugin.getCommentsLayer();
    const newLayer = mockLayerInstances[0];
    expect(newLayer.setZIndex).toHaveBeenCalledWith(6); // 5 + 1
  });

  it('4.2 selectionLayer absent → setZIndex NOT called on new layer', () => {
    const { plugin } = makePlugin(); // selectionLayer = undefined
    plugin.getCommentsLayer();
    const newLayer = mockLayerInstances[0];
    expect(newLayer.setZIndex).not.toHaveBeenCalled();
  });
});

// ─── Suite 5: deleteComments() ────────────────────────────────────────────────

describe('WeaveCommentsRendererPlugin - deleteComments()', () => {
  beforeEach(() => { mockLayerInstances = []; vi.clearAllMocks(); });

  it('5.1 destroyChildren() called on the comments layer', () => {
    const existing = makeExistingLayer();
    const { plugin } = makePlugin({ existingLayer: existing });
    plugin.deleteComments();
    expect(existing.destroyChildren).toHaveBeenCalled();
  });
});

// ─── Suite 6: render() ────────────────────────────────────────────────────────

describe('WeaveCommentsRendererPlugin - render()', () => {
  beforeEach(() => { mockLayerInstances = []; vi.clearAllMocks(); });

  it('6.1 !isEnabled() → early return, deleteComments not called', () => {
    const existing = makeExistingLayer();
    const { plugin } = makePlugin({ existingLayer: existing });
    plugin.disable(); // sets enabled=false then calls deleteComments once
    existing.destroyChildren.mockClear(); // clear that call
    plugin.render(); // should early return
    expect(existing.destroyChildren).not.toHaveBeenCalled();
  });

  it('6.2 no comments → deleteComments called, no nodeHandler interactions', () => {
    const existing = makeExistingLayer();
    const nodeHandler = makeNodeHandler();
    const { plugin } = makePlugin({ existingLayer: existing, nodeHandler });
    plugin.render();
    expect(existing.destroyChildren).toHaveBeenCalled();
    expect(nodeHandler.onRender).not.toHaveBeenCalled();
  });

  it('6.3 resolved comment + handler → onRender, moveToBottom, layer.add, onUpdate called', () => {
    const existing = makeExistingLayer();
    const group = makeGroup();
    const nodeHandler = makeNodeHandler(group);
    const { plugin } = makePlugin({ existingLayer: existing, nodeHandler });
    const comment = resolvedComment();
    plugin.setComments([comment]);
    plugin.render();
    expect(nodeHandler.onRender).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', x: 10, y: 20 })
    );
    expect(group.moveToBottom).toHaveBeenCalled();
    expect(existing.add).toHaveBeenCalledWith(group);
    expect(nodeHandler.onUpdate).toHaveBeenCalledWith(group, { commentAction: 'idle' });
  });

  it('6.4 resolved comment + no handler → onRender NOT called', () => {
    const existing = makeExistingLayer();
    const { plugin, weave } = makePlugin({ existingLayer: existing });
    weave.getNodeHandler.mockReturnValue(undefined);
    plugin.setComments([resolvedComment()]);
    plugin.render();
    // no handler — nothing rendered
    expect(existing.add).not.toHaveBeenCalled();
  });

  it('6.5 pending comment + handler → onRender, moveToTop, layer.add, onUpdate called', () => {
    const existing = makeExistingLayer();
    const group = makeGroup();
    const nodeHandler = makeNodeHandler(group);
    const { plugin } = makePlugin({ existingLayer: existing, nodeHandler });
    const comment = pendingComment();
    plugin.setComments([comment]);
    plugin.render();
    expect(nodeHandler.onRender).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c2', x: 30, y: 40 })
    );
    expect(group.moveToTop).toHaveBeenCalled();
    expect(existing.add).toHaveBeenCalledWith(group);
    expect(nodeHandler.onUpdate).toHaveBeenCalledWith(group, { commentAction: 'idle' });
  });

  it('6.6 pending comment + no handler → onRender NOT called', () => {
    const existing = makeExistingLayer();
    const { plugin, weave } = makePlugin({ existingLayer: existing });
    weave.getNodeHandler.mockReturnValue(undefined);
    plugin.setComments([pendingComment()]);
    plugin.render();
    expect(existing.add).not.toHaveBeenCalled();
  });
});

// ─── Suite 7: enable() / disable() ───────────────────────────────────────────

describe('WeaveCommentsRendererPlugin - enable() / disable()', () => {
  beforeEach(() => { mockLayerInstances = []; vi.clearAllMocks(); });

  it('7.1 enable() sets enabled=true and calls render()', () => {
    const existing = makeExistingLayer();
    const group = makeGroup();
    const nodeHandler = makeNodeHandler(group);
    const { plugin } = makePlugin({ existingLayer: existing, nodeHandler });
    plugin.disable(); // disable first
    existing.destroyChildren.mockClear();
    plugin.setComments([resolvedComment()]);
    plugin.enable();
    expect(plugin.enabled).toBe(true);
    // render() was called → deleteComments (destroyChildren) then renders comments
    expect(existing.destroyChildren).toHaveBeenCalled();
    expect(nodeHandler.onRender).toHaveBeenCalled();
  });

  it('7.2 disable() sets enabled=false and calls deleteComments()', () => {
    const existing = makeExistingLayer();
    const { plugin } = makePlugin({ existingLayer: existing });
    plugin.disable();
    expect(plugin.enabled).toBe(false);
    expect(existing.destroyChildren).toHaveBeenCalled();
  });
});
