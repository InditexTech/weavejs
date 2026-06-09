// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── hoisted state ────────────────────────────────────────────────────────────

const konvaState = vi.hoisted(() => ({
  lineInsts: [] as Record<string, unknown>[],
}));

// ─── mocks ────────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {
    Line: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
      const inst = { ...cfg, destroy: vi.fn() };
      konvaState.lineInsts.push(inst);
      return inst;
    }),
  },
}));

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

vi.mock('../utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils')>();
  return {
    ...original,
    getNodeRect: vi.fn().mockImplementation((_node: unknown, _rel: unknown) => ({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    })),
    getNodesRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
    applySnap: vi.fn(),
  };
});

vi.mock('../nodes-snapping.custom-guides', () => ({
  WeaveNodesSnappingCustomGuides: class {
    getAllCustomGuides = vi.fn().mockReturnValue({});
    saveCustomGuide = vi.fn();
    renderAllVisibleCustomGuides = vi.fn();
  },
}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { WeaveNodesSnappingGuides } from '../nodes-snapping.guides';
import { GUIDE_KIND, GUIDE_ORIENTATION } from '../constants';
import type { Guide } from '../types';
import { applySnap, getNodeRect } from '../utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeLayer() {
  const nodes: { name?: string; destroy: ReturnType<typeof vi.fn> }[] = [];
  return {
    add: vi.fn(),
    batchDraw: vi.fn(),
    find: vi.fn((selector: string) => {
      const name = selector.replace('.', '');
      return nodes.filter((n) => n.name === name);
    }),
    _nodes: nodes,
  };
}

function makeStage(opts: { scaleX?: number; findOne?: unknown } = {}) {
  return {
    scaleX: vi.fn().mockReturnValue(opts.scaleX ?? 1),
    scaleY: vi.fn().mockReturnValue(1),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    findOne: vi.fn().mockReturnValue(
      opts.findOne !== undefined
        ? opts.findOne
        : {
            getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 200 }),
            getAttrs: vi.fn().mockReturnValue({}),
          }
    ),
    getParent: vi.fn().mockReturnValue(null),
  };
}

function makeWeave(stage: ReturnType<typeof makeStage>) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('mainLayer') }),
    getEventsController: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(undefined),
  };
}

function makeCustomGuidesManager() {
  return {
    getAllCustomGuides: vi.fn().mockReturnValue({}),
    saveCustomGuide: vi.fn(),
    renderAllVisibleCustomGuides: vi.fn(),
  };
}

function makeConcreteGuide(
  orientation: 'H' | 'V',
  value: number,
  id = 'g1',
  containerId = 'mainLayer'
): Guide {
  return {
    orientation,
    value,
    kind: GUIDE_KIND.STATIC,
    guideId: id,
    containerId,
  };
}

function makeNode(id: string, visible = true) {
  return {
    isVisible: vi.fn().mockReturnValue(visible),
    id: vi.fn().mockReturnValue(id),
    getAttrs: vi.fn().mockReturnValue({ id }),
    getClientRect: vi.fn().mockReturnValue({ x: 10, y: 10, width: 80, height: 40 }),
  };
}

// ─── setup ────────────────────────────────────────────────────────────────────

function setup(stageOpts?: Parameters<typeof makeStage>[0]) {
  konvaState.lineInsts.length = 0;
  const stage = makeStage(stageOpts);
  const weave = makeWeave(stage);
  const layer = makeLayer();
  const customGuidesManager = makeCustomGuidesManager();

  const guidesManager = new WeaveNodesSnappingGuides(
    weave as never,
    customGuidesManager as never,
    layer as never,
    {
      tolerance: 5,
      style: {
        static: {
          default: { stroke: '#f00', strokeWidth: 1, dash: [6, 6], opacity: 1 },
          selected: { stroke: '#00f', strokeWidth: 2, dash: [6, 6], opacity: 1 },
        },
        custom: {
          default: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
          selected: { stroke: '#00f', strokeWidth: 2, dash: [], opacity: 1 },
        },
      },
    }
  );

  return { guidesManager, stage, weave, layer, customGuidesManager };
}

// ─── getGuidesFromOtherNodes ──────────────────────────────────────────────────

describe('WeaveNodesSnappingGuides.getGuidesFromOtherNodes', () => {
  it('returns empty array when relativeTo is falsy', () => {
    const { guidesManager } = setup();
    const result = guidesManager.getGuidesFromOtherNodes([], [], null as never);
    expect(result).toEqual([]);
  });

  it('skips nodes that are in draggedNodes', () => {
    const { guidesManager } = setup();
    const node = makeNode('n1');
    const relativeTo = { id: vi.fn().mockReturnValue('mainLayer') };

    const result = guidesManager.getGuidesFromOtherNodes(
      [node] as never,
      [node] as never,
      relativeTo as never
    );
    expect(result).toHaveLength(0);
  });

  it('skips invisible nodes', () => {
    const { guidesManager } = setup();
    const invisible = makeNode('n1', false);
    const relativeTo = { id: vi.fn().mockReturnValue('mainLayer') };

    const result = guidesManager.getGuidesFromOtherNodes(
      [],
      [invisible] as never,
      relativeTo as never
    );
    expect(result).toHaveLength(0);
  });

  it('generates 6 guides per visible peer node (3 vertical + 3 horizontal)', () => {
    const { guidesManager } = setup();
    const peer = makeNode('peer1');
    const relativeTo = { id: vi.fn().mockReturnValue('mainLayer') };

    vi.mocked(getNodeRect).mockReturnValueOnce({ x: 10, y: 10, width: 80, height: 40 });

    const result = guidesManager.getGuidesFromOtherNodes(
      [],
      [peer] as never,
      relativeTo as never
    );

    expect(result).toHaveLength(6);

    const vertical = result.filter((g) => g.orientation === GUIDE_ORIENTATION.VERTICAL);
    const horizontal = result.filter((g) => g.orientation === GUIDE_ORIENTATION.HORIZONTAL);

    expect(vertical).toHaveLength(3);
    expect(horizontal).toHaveLength(3);
  });

  it('generates guides with correct left/center/right values', () => {
    const { guidesManager } = setup();
    const peer = makeNode('peer1');
    const relativeTo = { id: vi.fn().mockReturnValue('mainLayer') };

    vi.mocked(getNodeRect).mockReturnValueOnce({ x: 10, y: 20, width: 80, height: 40 });

    const result = guidesManager.getGuidesFromOtherNodes(
      [],
      [peer] as never,
      relativeTo as never
    );

    const verticals = result
      .filter((g) => g.orientation === GUIDE_ORIENTATION.VERTICAL)
      .map((g) => g.value);

    // left=10, center=50, right=90
    expect(verticals).toContain(10);
    expect(verticals).toContain(50);
    expect(verticals).toContain(90);
  });

  it('sets containerId to relativeTo.id() on all guides', () => {
    const { guidesManager } = setup();
    const peer = makeNode('peer1');
    const relativeTo = { id: vi.fn().mockReturnValue('container123') };

    vi.mocked(getNodeRect).mockReturnValueOnce({ x: 0, y: 0, width: 100, height: 50 });

    const result = guidesManager.getGuidesFromOtherNodes(
      [],
      [peer] as never,
      relativeTo as never
    );

    expect(result.every((g) => g.containerId === 'container123')).toBe(true);
  });
});

// ─── clearSnapGuides ──────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuides.clearSnapGuides', () => {
  it('destroys all snap-guide elements and calls batchDraw', () => {
    const { guidesManager, layer } = setup();
    const destroyFn = vi.fn();
    layer.find = vi.fn().mockReturnValue([{ destroy: destroyFn }]);

    guidesManager.clearSnapGuides();

    expect(destroyFn).toHaveBeenCalled();
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('does nothing if no guides are found', () => {
    const { guidesManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    expect(() => guidesManager.clearSnapGuides()).not.toThrow();
    expect(layer.batchDraw).toHaveBeenCalled();
  });
});

// ─── renderSnapGuides ─────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuides.renderSnapGuides', () => {
  it('adds a vertical Konva.Line to the layer', () => {
    const { guidesManager, stage, layer } = setup();
    stage.findOne.mockReturnValue(null);

    const snap = {
      orientation: GUIDE_ORIENTATION.VERTICAL,
      guideId: 'g1',
      containerId: 'mainLayer',
      guide: 100,
      offset: 0,
      diff: 1,
      kind: 'static' as const,
    };

    // Pass stage itself as container so container === stage in getVisibleStageRect
    guidesManager.renderSnapGuides(stage as never, snap);

    expect(layer.add).toHaveBeenCalled();
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('adds a horizontal Konva.Line to the layer', () => {
    const { guidesManager, stage, layer } = setup();
    stage.findOne.mockReturnValue(null);

    const snap = {
      orientation: GUIDE_ORIENTATION.HORIZONTAL,
      guideId: 'g2',
      containerId: 'mainLayer',
      guide: 200,
      offset: 0,
      diff: 1,
      kind: 'static' as const,
    };

    // Pass stage itself as container so container === stage in getVisibleStageRect
    guidesManager.renderSnapGuides(stage as never, snap);

    expect(layer.add).toHaveBeenCalled();
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('adjusts guide value by containerNode position when containerId !== mainLayer', () => {
    const containerNode = {
      getClientRect: vi.fn().mockReturnValue({ x: 50, y: 0, width: 300, height: 300 }),
    };
    const { guidesManager, stage, layer } = setup({
      findOne: containerNode,
    });

    const snap = {
      orientation: GUIDE_ORIENTATION.VERTICAL,
      guideId: 'g3',
      containerId: 'frame1',
      guide: 10,
      offset: 0,
      diff: 1,
      kind: 'static' as const,
    };
    // Container is a frame node (not stage); its parent is the stage
    const container = {
      id: vi.fn().mockReturnValue('frame1'),
      getParent: vi.fn().mockReturnValue(stage),
      position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      getClientRect: vi.fn().mockReturnValue({ x: 50, y: 0, width: 300, height: 300 }),
    };

    guidesManager.renderSnapGuides(container as never, snap);

    // The line should be added — value = containerPos.x + snap.guide = 50 + 10 = 60
    expect(layer.add).toHaveBeenCalled();
  });
});

// ─── performSnapping ──────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuides.performSnapping', () => {
  it('calls clearSnapGuides and batchDraw after snapping', () => {
    const { guidesManager, stage, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const node = makeNode('n1');

    vi.mocked(getNodeRect).mockReturnValue({ x: 10, y: 10, width: 80, height: 40 });

    guidesManager.performSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      stage as never,
      []
    );

    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('does not throw when no snap matches found', () => {
    const { guidesManager, stage, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    const node = makeNode('n1');

    vi.mocked(getNodeRect).mockReturnValue({ x: 10, y: 10, width: 80, height: 40 });

    expect(() =>
      guidesManager.performSnapping([node] as never, [{ x: 0, y: 0 }], stage as never, [])
    ).not.toThrow();
  });

  it('finds a snap match within tolerance and applies it', () => {
    const { guidesManager, stage, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const node = makeNode('n1');

    // node snap point: vertical at x=10
    vi.mocked(getNodeRect).mockReturnValue({ x: 10, y: 10, width: 80, height: 40 });

    // guide at 12 — diff = 2 which is within tolerance = 5
    const guide = makeConcreteGuide('V', 12);
    const mockApplySnap = vi.mocked(applySnap);

    guidesManager.performSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      stage as never,
      [guide]
    );

    expect(mockApplySnap).toHaveBeenCalled();
  });
});

// ─── copyContainerGuidesToClipboard ──────────────────────────────────────────

describe('WeaveNodesSnappingGuides.copyContainerGuidesToClipboard', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    });
  });

  it('throws when no guides found for container', async () => {
    const { guidesManager, customGuidesManager } = setup();
    customGuidesManager.getAllCustomGuides.mockReturnValue({ container1: [] });

    await expect(
      guidesManager.copyContainerGuidesToClipboard('container1')
    ).rejects.toThrow('No guides to copy');
  });

  it('throws when container node not found in stage', async () => {
    const { guidesManager, customGuidesManager, stage } = setup();
    const guide = makeConcreteGuide('V', 100, 'g1', 'container1');
    customGuidesManager.getAllCustomGuides.mockReturnValue({ container1: [guide] });
    stage.findOne.mockReturnValue(null);

    await expect(
      guidesManager.copyContainerGuidesToClipboard('container1')
    ).rejects.toThrow('Container not found');
  });

  it('writes JSON to clipboard on success', async () => {
    const { guidesManager, customGuidesManager, stage } = setup();
    const guide = makeConcreteGuide('V', 100, 'g1', 'container1');
    customGuidesManager.getAllCustomGuides.mockReturnValue({ container1: [guide] });
    stage.findOne.mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ nodeType: 'frame' }) });

    await guidesManager.copyContainerGuidesToClipboard('container1');

    const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    const parsed = JSON.parse(written);
    expect(parsed.weave.kind).toBe('guides');
    expect(parsed.weave.guides).toHaveLength(1);
  });
});

// ─── pasteGuidesFromClipboard ─────────────────────────────────────────────────

describe('WeaveNodesSnappingGuides.pasteGuidesFromClipboard', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    });
  });

  it('throws when container is not found', async () => {
    const { guidesManager, stage } = setup();
    stage.findOne.mockReturnValue(null);

    await expect(
      guidesManager.pasteGuidesFromClipboard('container1')
    ).rejects.toThrow('Container not found');
  });

  it('throws when clipboard text is invalid JSON', async () => {
    const { guidesManager, stage } = setup();
    stage.findOne.mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) });
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('not-json');

    await expect(
      guidesManager.pasteGuidesFromClipboard('container1')
    ).rejects.toThrow('Cannot parse clipboard data as guides');
  });

  it('throws when clipboard JSON does not have weave.kind = guides', async () => {
    const { guidesManager, stage } = setup();
    stage.findOne.mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) });
    vi.mocked(navigator.clipboard.readText).mockResolvedValue(
      JSON.stringify({ weave: { kind: 'other' } })
    );

    await expect(
      guidesManager.pasteGuidesFromClipboard('container1')
    ).rejects.toThrow('Cannot parse clipboard data as guides');
  });

  it('saves each guide and calls renderAllVisibleCustomGuides on success', async () => {
    const { guidesManager, stage, customGuidesManager } = setup();
    stage.findOne.mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) });

    const guideData = { orientation: 'V', value: 50, kind: 'custom', guideId: 'x' };
    vi.mocked(navigator.clipboard.readText).mockResolvedValue(
      JSON.stringify({ weave: { kind: 'guides', guides: [guideData] } })
    );

    await guidesManager.pasteGuidesFromClipboard('container1');

    expect(customGuidesManager.saveCustomGuide).toHaveBeenCalledTimes(1);
    expect(customGuidesManager.renderAllVisibleCustomGuides).toHaveBeenCalled();
  });
});
