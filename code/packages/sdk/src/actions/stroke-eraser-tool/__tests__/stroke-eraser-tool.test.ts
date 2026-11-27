// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

import Konva from 'konva';
import type { WeaveStateElement } from '@inditextech/weave-types';
import { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import { WeaveStrokeEraserToolAction } from '../stroke-eraser-tool';
import {
  STROKE_ERASER_MUTEX_OPERATION,
  STROKE_ERASER_TOOL_ACTION_NAME,
  STROKE_ERASER_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import { createBrushInstruments } from '../../brush-tool/tunables/presets';
import type { WeaveStrokeErasure } from '@/nodes/stroke/render/erasure';

type Op =
  | { type: 'update'; element: WeaveStateElement }
  | { type: 'add'; element: WeaveStateElement; parentId: string; index: number }
  | { type: 'remove'; element: WeaveStateElement };

type StrokeSpec = {
  id: string;
  /** Extent of the line along the node's x axis. */
  x0?: number;
  x1?: number;
  /** Where the line is drawn in the layer; ignored when `at` is given. */
  y?: number;
  step?: number;
  at?: { x: number; y: number };
  rotation?: number;
  scale?: number;
  width?: number;
  attrs?: Record<string, unknown>;
};

/** A document and the instance an action needs, over a real Konva stage. */
function makeWorld() {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
  });
  const mainLayer = new Konva.Layer();
  const utilityLayer = new Konva.Layer();
  stage.add(mainLayer);
  stage.add(utilityLayer);

  const handler = new WeaveStrokeNode();
  const order: string[] = [];
  const ops: Op[] = [];
  const locks: { nodeIds: string[]; operation: string }[] = [];
  const transactions = { count: 0, inside: 0, opsInside: [] as number[] };
  let pointer = { x: 0, y: 0 };
  let activeAction: string | undefined = STROKE_ERASER_TOOL_ACTION_NAME;
  let lockResult = true;

  mainLayer.getRelativePointerPosition = () => ({ ...pointer });
  stage.getRelativePointerPosition = () => ({ ...pointer });

  const instance = {
    getStage: () => stage,
    getMainLayer: () => mainLayer,
    getUtilityLayer: () => utilityLayer,
    getNodeHandler: (type: string) => (type === 'stroke' ? handler : undefined),
    getActiveAction: () => activeAction,
    getEventsController: () => ({ signal: new AbortController().signal }),
    getStore: () => ({ getUser: () => ({ id: 'me', name: 'me' }) }),
    getPlugin: vi.fn(() => undefined),
    triggerAction: vi.fn(),
    allNodesLocked: (nodes: Konva.Node[]) =>
      nodes.every((n) => n.getAttrs().locked === true),
    emitEvent: vi.fn(),
    getNode: (id: string) => ({
      node: order.includes(id) ? ({ key: id } as WeaveStateElement) : null,
      parent: { key: 'mainLayer' } as WeaveStateElement,
      index: order.indexOf(id),
    }),
    stateTransactional: (cb: () => void) => {
      transactions.count++;
      transactions.inside++;
      const before = ops.length;
      cb();
      transactions.opsInside.push(ops.length - before);
      transactions.inside--;
    },
    acquireMutexLock: async (
      lock: { nodeIds: string[]; operation: string },
      action: () => void | Promise<void>
    ) => {
      locks.push(lock);
      if (lockResult) await Promise.resolve(action());
    },
    updateNodeNT: (element: WeaveStateElement) => {
      expect(transactions.inside).toBeGreaterThan(0);
      ops.push({ type: 'update', element });
    },
    addNodeNT: (
      element: WeaveStateElement,
      parentId: string,
      options: { index: number }
    ) => {
      expect(transactions.inside).toBeGreaterThan(0);
      order.splice(options.index, 0, element.key);
      ops.push({ type: 'add', element, parentId, index: options.index });
    },
    removeNodeNT: (element: WeaveStateElement) => {
      expect(transactions.inside).toBeGreaterThan(0);
      order.splice(order.indexOf(element.key), 1);
      ops.push({ type: 'remove', element });
    },
  };

  /** A horizontal stroke whose line is at `y` (in the layer, before `at` is applied). */
  const addStroke = (spec: StrokeSpec): Konva.Shape => {
    const {
      id,
      x0 = 0,
      x1 = 100,
      y = 10,
      step = 2,
      at,
      rotation = 0,
      scale = 1,
      width = 8,
      attrs = {},
    } = spec;
    // like a stored stroke: points inside the box of the node, relative to it
    const strokeElements = [];
    for (let x = x0; x <= x1; x += step) {
      strokeElements.push({ x, y: width / 2, pressure: 0.8 });
    }
    const shape = new Konva.Shape({
      id,
      name: 'node',
      nodeType: 'stroke',
      x: at ? at.x : 0,
      y: at ? at.y : y - width / 2,
      rotation,
      scaleX: scale,
      scaleY: scale,
      width: x1 - x0,
      height: width,
      strokeWidth: width,
      stroke: '#000000ff',
      strokeElements,
      sceneFunc: () => {},
      ...attrs,
    });
    mainLayer.add(shape);
    order.push(id);
    return shape;
  };

  return {
    stage,
    mainLayer,
    utilityLayer,
    handler,
    instance,
    order,
    ops,
    locks,
    transactions,
    addStroke,
    pointTo: (x: number, y: number) => {
      pointer = { x, y };
    },
    setActive: (name: string | undefined) => {
      activeAction = name;
    },
    setLockResult: (ok: boolean) => {
      lockResult = ok;
    },
  };
}

type World = ReturnType<typeof makeWorld>;

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(
  config?: ConstructorParameters<typeof WeaveStrokeEraserToolAction>[0]
) {
  const world = makeWorld();
  const action = new WeaveStrokeEraserToolAction(config);
  (action as unknown as { instance: unknown }).instance = world.instance;
  const cancel = vi.fn();

  const down = (x: number, y: number) => {
    world.pointTo(x, y);
    world.stage.fire('pointerdown', {
      evt: { pointerType: 'mouse', button: 0 },
    });
  };
  const move = (x: number, y: number) => {
    world.pointTo(x, y);
    world.stage.fire('pointermove', { evt: { pointerType: 'mouse' } });
  };
  const up = async (x?: number, y?: number) => {
    if (x !== undefined && y !== undefined) world.pointTo(x, y);
    world.stage.fire('pointerup', { evt: { pointerType: 'mouse' } });
    await flush();
  };
  const press = (code: string) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));

  /** One drag across, from (x, y0) to (x, y1). */
  const drag = async (x: number, y0: number, y1: number) => {
    down(x, y0);
    move(x, (y0 + y1) / 2);
    move(x, y1);
    await up(x, y1);
  };

  return { world, action, cancel, down, move, up, press, drag };
}

const maskOf = (world: World, shape: Konva.Node) =>
  world.handler.getEraseMask(shape);

/** The paths of the eraser that are shown on a stroke while a drag goes on. */
const chainsOf = maskOf;

/** The axes of a square erasure, as numbers: a zero may come out as minus zero. */
const expectAxes = (erasure: WeaveStrokeErasure, expected: number[]) => {
  const axes = (erasure as { axes: number[] }).axes;
  expected.forEach((v, i) => expect(axes[i]).toBeCloseTo(v, 9));
};

/** Distance from a point to a path through points. */
const distanceToPolyline = (
  p: { x: number; y: number },
  line: { x: number; y: number }[]
) => {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l = ex * ex + ey * ey;
    const t = l
      ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l))
      : 0;
    best = Math.min(
      best,
      Math.hypot(p.x - (a.x + ex * t), p.y - (a.y + ey * t))
    );
  }
  return best;
};

const updateOf = (ops: Op[], id: string) =>
  ops.find((o) => o.type === 'update' && o.element.key === id) as
    | Extract<Op, { type: 'update' }>
    | undefined;
const addsOf = (ops: Op[]) =>
  ops.filter((o): o is Extract<Op, { type: 'add' }> => o.type === 'add');

let created: ReturnType<typeof setup>[] = [];
const make = (config?: Parameters<typeof setup>[0]) => {
  const s = setup(config);
  created.push(s);
  return s;
};

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    setTimeout(cb, 0);
    return 0;
  });
});
afterEach(() => {
  for (const { action } of created) {
    try {
      action.cleanup();
    } catch {
      /* the instance may be gone */
    }
  }
  created = [];
  vi.unstubAllGlobals();
});

// ─── registration and lifecycle ──────────────────────────────────────────────

describe('lifecycle', () => {
  it('is named strokeEraserTool and starts idle', () => {
    const { action } = make();
    expect(action.getName()).toBe('strokeEraserTool');
    expect((action as unknown as { state: string }).state).toBe(
      STROKE_ERASER_TOOL_STATE.IDLE
    );
  });

  it('triggers: becomes active, shows a ring cursor on the utility layer', () => {
    const { action, world, cancel } = make();
    action.trigger(cancel);

    expect((action as unknown as { state: string }).state).toBe(
      STROKE_ERASER_TOOL_STATE.ERASING
    );
    expect(world.utilityLayer.getChildren()).toHaveLength(1);
    const ring = world.utilityLayer.getChildren()[0].getChildren();
    expect(ring).toHaveLength(2);
    expect(ring.map((c) => c.getClassName())).toEqual(['Circle', 'Circle']);
    expect(world.stage.container().style.cursor).toBe('none');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('cancels itself without a utility layer', () => {
    const { action, world, cancel } = make();
    (world.instance as { getUtilityLayer: () => unknown }).getUtilityLayer =
      () => undefined;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    action.trigger(cancel);
    expect(cancel).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('disables the selection plugin while active and restores it on cleanup', () => {
    const { action, world, cancel } = make();
    const plugin = {
      setSelectedNodes: vi.fn(),
      disable: vi.fn(),
      enable: vi.fn(),
    };
    (world.instance.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(
      plugin
    );

    action.trigger(cancel);
    expect(plugin.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(plugin.disable).toHaveBeenCalled();

    action.cleanup();
    expect(plugin.enable).toHaveBeenCalled();
    expect(world.instance.triggerAction).toHaveBeenCalledWith(
      SELECTION_TOOL_ACTION_NAME
    );
    expect(world.utilityLayer.getChildren()).toHaveLength(0);
    expect(world.stage.container().style.cursor).toBe('default');
    expect((action as unknown as { state: string }).state).toBe(
      STROKE_ERASER_TOOL_STATE.IDLE
    );
  });

  it('exits the tool on Escape when no gesture is running', () => {
    const { action, cancel, press } = make();
    action.trigger(cancel);
    press('Escape');
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('ignores pointer events when another action is active', async () => {
    const { action, world, cancel, down, move, up } = make();
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);
    world.setActive('selectionTool');

    down(50, -10);
    move(50, 10);
    await up(50, 30);
    expect(maskOf(world, stroke)).toBeNull();
    expect(world.ops).toHaveLength(0);
  });
});

// ─── the eraser: its size, its shape and its ring ────────────────────────────

describe('the size and shape of the eraser', () => {
  const ringOf = (world: World) => world.utilityLayer.getChildren()[0];

  it('is a circle of 24 screen pixels by default', () => {
    const { action } = make();
    expect(
      (action as unknown as { getSettings: () => unknown }).getSettings()
    ).toEqual({ size: 24, shape: 'circle' });
  });

  it('can be a square from the start', () => {
    const { action, world, cancel } = make({
      config: { shape: 'square', size: 30 },
    });
    action.trigger(cancel);
    const [outer, inner] = ringOf(world).getChildren() as Konva.Rect[];
    expect(outer.getClassName()).toBe('Rect');
    expect([outer.width(), inner.width()]).toEqual([32, 30]);
    expect([outer.x(), inner.x()]).toEqual([-16, -15]);
  });

  it('changes the ring while the tool is in use', () => {
    const { action, world, cancel } = make();
    action.trigger(cancel);
    const circles = ringOf(world).getChildren() as Konva.Circle[];
    expect(circles.map((c) => c.radius())).toEqual([13, 12]);

    action.updateProps({ size: 40 });
    expect(world.utilityLayer.getChildren()).toHaveLength(1);
    expect(
      (ringOf(world).getChildren() as Konva.Circle[]).map((c) => c.radius())
    ).toEqual([21, 20]);

    action.updateProps({ shape: 'square' });
    expect(world.utilityLayer.getChildren()).toHaveLength(1);
    const rects = ringOf(world).getChildren() as Konva.Rect[];
    expect(rects.map((r) => r.getClassName())).toEqual(['Rect', 'Rect']);
    expect(rects.map((r) => r.width())).toEqual([42, 40]);

    action.updateProps({ shape: 'circle' });
    expect(ringOf(world).getChildren()[0].getClassName()).toBe('Circle');
  });

  it('keeps the ring where the pointer is when it changes', () => {
    const { action, world, cancel, move } = make();
    action.trigger(cancel);
    move(120, 80);
    action.updateProps({ shape: 'square' });
    expect(ringOf(world).position()).toEqual({ x: 120, y: 80 });
  });

  it('does not touch the ring when it is not in use', () => {
    const { action, world } = make();
    action.updateProps({ shape: 'square', size: 50 });
    expect(world.utilityLayer.getChildren()).toHaveLength(0);
  });

  it('falls back to the defaults for a value that is not valid', () => {
    const { action, world, cancel } = make();
    action.updateProps({ size: -5, shape: 'star' });
    action.trigger(cancel);
    const circles = ringOf(world).getChildren() as Konva.Circle[];
    expect(circles.map((c) => c.radius())).toEqual([13, 12]);
    expect(
      (action as unknown as { getSettings: () => unknown }).getSettings()
    ).toEqual({ size: 24, shape: 'circle' });
  });

  it('erases with a square once it is chosen, also in the middle of a session', () => {
    const { action, world, cancel, down } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);
    action.updateProps({ shape: 'square' });

    down(50, 10);
    const [chain] = chainsOf(world, stroke)!;
    expect(chain.shape).toBe('square');
    expectAxes(chain, [6, 0, 0, 6]);
  });

  it('keeps the same screen size for a square at any zoom', () => {
    for (const zoom of [0.5, 2]) {
      const { action, world, cancel, down } = make({
        config: { size: 20, shape: 'square' },
      });
      world.stage.scale({ x: zoom, y: zoom });
      const stroke = world.addStroke({ id: 's' });
      action.trigger(cancel);
      down(50, 10);
      const [chain] = chainsOf(world, stroke)!;
      const axes = (chain as { axes: number[] }).axes;
      expect(axes[0]).toBeCloseTo(10 / zoom, 9);
      expect(axes[3]).toBeCloseTo(10 / zoom, 9);
    }
  });

  it('turns a square with the stroke it erases', () => {
    const { action, world, cancel, down } = make({
      config: { size: 10, shape: 'square' },
    });
    const stroke = world.addStroke({
      id: 's',
      at: { x: 100, y: 100 },
      rotation: 90,
    });
    action.trigger(cancel);
    down(100, 150);
    const axes = (chainsOf(world, stroke)![0] as { axes: number[] }).axes;
    expect(axes[0]).toBeCloseTo(0, 6);
    expect(axes[1]).toBeCloseTo(-5, 6);
    expect(axes[2]).toBeCloseTo(5, 6);
    expect(axes[3]).toBeCloseTo(0, 6);
  });
});

// ─── pointer handling ────────────────────────────────────────────────────────

describe('pointer handling', () => {
  it('sizes the eraser in screen pixels, whatever the zoom', () => {
    for (const zoom of [1, 4, 0.5]) {
      const { action, world, cancel, down } = make({ config: { size: 24 } });
      world.stage.scale({ x: zoom, y: zoom });
      const stroke = world.addStroke({ id: 's' });
      action.trigger(cancel);

      down(50, 10);
      // 12 screen px of radius is 12 / zoom canvas units
      expect(
        (chainsOf(world, stroke)![0] as { radius: number }).radius
      ).toBeCloseTo(12 / zoom, 9);
    }
  });

  it('takes the radius at each sample from the zoom at that sample', () => {
    const { action, world, cancel, down, move } = make({
      config: { size: 20 },
    });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(10, 10);
    world.stage.scale({ x: 2, y: 2 });
    move(20, 10);
    const radii = chainsOf(world, stroke)!.map(
      (c) => (c as { radius: number }).radius
    );
    expect(radii).toEqual([10, 5]);
  });

  it('keeps one path while the drag goes on', () => {
    const { action, world, cancel, down, move } = make({ config: { size: 8 } });
    const stroke = world.addStroke({ id: 's', y: 10 });
    action.trigger(cancel);

    down(10, 10);
    move(20, 10);
    move(30, 14);
    const chains = chainsOf(world, stroke)!;
    expect(chains).toHaveLength(1);
    expect(chains[0].points.slice(-4)).toEqual([20, 10 - 6, 30, 14 - 6]);
  });

  it('joins samples into a path, so a fast drag does not skip a stroke', () => {
    const { action, world, cancel, down, move } = make({ config: { size: 4 } });
    const stroke = world.addStroke({ id: 's', y: 100 });
    action.trigger(cancel);

    down(50, 0);
    move(50, 400);
    // from one end of the drag step to the other, in the space of the stroke
    expect(chainsOf(world, stroke)![0].points.slice(-4)).toEqual([
      50,
      0 - stroke.y(),
      50,
      400 - stroke.y(),
    ]);
  });

  it('gives the path in the space of the stroke', () => {
    const { action, world, cancel, down } = make({ config: { size: 8 } });
    const stroke = world.addStroke({ id: 's', at: { x: 100, y: 200 } });
    action.trigger(cancel);

    down(130, 204);
    expect(chainsOf(world, stroke)![0].points.slice(0, 2)).toEqual([30, 4]);
  });

  it('only reaches the strokes near the eraser', () => {
    const { action, world, cancel, down } = make({ config: { size: 8 } });
    const near = world.addStroke({ id: 'near', y: 10 });
    const far = world.addStroke({ id: 'far', y: 400 });
    action.trigger(cancel);

    down(50, 12);
    expect(maskOf(world, near)).not.toBeNull();
    expect(maskOf(world, far)).toBeNull();
  });

  it('starts a path for a stroke the eraser reaches only after it has been dragged for a while', () => {
    const { action, world, cancel, down, move } = make({ config: { size: 8 } });
    const late = world.addStroke({ id: 'late', y: 300 });
    action.trigger(cancel);

    down(50, 10);
    move(50, 100);
    expect(maskOf(world, late)).toBeNull();
    move(50, 296);
    // the step that reaches it starts where the previous one ended
    const chains = chainsOf(world, late)!;
    expect(chains).toHaveLength(1);
    expect(chains[0].points).toEqual([50, 100 - late.y(), 50, 296 - late.y()]);
  });

  it('ignores a button other than the main one', () => {
    const { action, world, cancel } = make();
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);
    world.pointTo(50, 10);
    world.stage.fire('pointerdown', {
      evt: { pointerType: 'mouse', button: 2 },
    });
    expect(maskOf(world, stroke)).toBeNull();
  });

  it('discards the gesture on Escape: no mask, nothing written', async () => {
    const { action, world, cancel, down, move, up, press } = make({
      config: { size: 24 },
    });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(50, -10);
    move(50, 10);
    expect(maskOf(world, stroke)).not.toBeNull();

    press('Escape');
    expect(maskOf(world, stroke)).toBeNull();
    expect(cancel).not.toHaveBeenCalled();

    await up(50, 30);
    expect(world.ops).toHaveLength(0);
    expect(world.transactions.count).toBe(0);
    expect((action as unknown as { state: string }).state).toBe(
      STROKE_ERASER_TOOL_STATE.ERASING
    );
  });

  it('moves the ring cursor with the pointer and keeps its size on screen', () => {
    const { action, world, cancel, move } = make();
    action.trigger(cancel);
    world.stage.scale({ x: 2, y: 2 });
    move(40, 60);
    const ring = world.utilityLayer.getChildren()[0];
    expect(ring.position()).toEqual({ x: 40, y: 60 });
    expect(ring.scaleX()).toBeCloseTo(0.5, 9);
  });
});

// ─── what can be erased ──────────────────────────────────────────────────────

describe('what the eraser reaches', () => {
  it('leaves other node types alone', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const rect = new Konva.Rect({
      id: 'r',
      nodeType: 'rectangle',
      x: 40,
      y: 0,
      width: 30,
      height: 30,
    });
    world.mainLayer.add(rect);
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(50, 10);
    expect(maskOf(world, stroke)).not.toBeNull();
    expect(rect.getAttrs().eraseMask).toBeUndefined();
  });

  it('leaves a single-line stroke alone', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const single = new Konva.Rect({
      id: 'single',
      nodeType: 'stroke-single',
      x: 40,
      y: 0,
      width: 30,
      height: 30,
    });
    world.mainLayer.add(single);
    action.trigger(cancel);
    down(50, 10);
    expect(single.getAttrs().eraseMask).toBeUndefined();
  });

  it('leaves a locked stroke alone, with no preview', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const locked = world.addStroke({ id: 'l', attrs: { locked: true } });
    action.trigger(cancel);
    down(50, 10);
    expect(maskOf(world, locked)).toBeNull();
  });

  it('leaves a stroke locked by another user alone', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const theirs = world.addStroke({
      id: 't',
      attrs: { mutexLocked: true, mutexUserId: 'someone-else' },
    });
    action.trigger(cancel);
    down(50, 10);
    expect(maskOf(world, theirs)).toBeNull();
  });

  it('can erase a stroke the current user holds the lock of', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const mine = world.addStroke({
      id: 'm',
      attrs: { mutexLocked: true, mutexUserId: 'me' },
    });
    action.trigger(cancel);
    down(50, 10);
    expect(maskOf(world, mine)).not.toBeNull();
  });

  it('leaves the preview of a stroke being drawn alone', () => {
    const { action, world, cancel, down } = make({ config: { size: 40 } });
    const preview = world.addStroke({ id: 'x--preview' });
    action.trigger(cancel);
    down(50, 10);
    expect(maskOf(world, preview)).toBeNull();
  });

  it('erases a stroke inside a transformed group', () => {
    const { action, world, cancel, down } = make({ config: { size: 8 } });
    const group = new Konva.Group({ x: 300, y: 100, rotation: 90, id: 'g' });
    world.mainLayer.add(group);
    const shape = world.addStroke({ id: 'in', at: { x: 0, y: 0 } });
    group.add(shape);
    action.trigger(cancel);

    // the group is turned a quarter: the stroke now runs down the layer from (300, 100)
    down(296, 150);
    const [x, y] = chainsOf(world, shape)![0].points;
    expect(x).toBeCloseTo(50, 6);
    expect(y).toBeCloseTo(4, 6);
  });
});

// ─── commit ──────────────────────────────────────────────────────────────────

describe('commit', () => {
  it('writes nothing while dragging and once on release', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(50, -20);
    move(50, 10);
    expect(world.ops).toHaveLength(0);
    expect(world.transactions.count).toBe(0);

    await up(50, 40);
    expect(world.transactions.count).toBe(1);
  });

  it('saves what was erased on the stroke, and changes nothing else of it', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({
      id: 's',
      width: 10,
      attrs: {
        look: { version: 1, outline: 'round' },
        inputMeta: { profile: 'mouse' },
        opacity: 0.75,
        globalCompositeOperation: 'multiply',
        dash: [4, 4],
      },
    });
    const before = world.handler.serialize(stroke as never).props;
    action.trigger(cancel);
    await drag(50, -20, 40);

    // one write, an update of the stroke: no new stroke, nothing moved in the order
    expect(world.ops).toHaveLength(1);
    expect(world.ops[0].type).toBe('update');
    expect(addsOf(world.ops)).toHaveLength(0);
    expect(world.order).toEqual(['s']);

    const { erasures, ...rest } = updateOf(world.ops, 's')!.element.props;
    expect(rest).toEqual(before);
    expect(rest).not.toHaveProperty('eraseMask');
    expect(erasures).toHaveLength(1);
  });

  it('saves the path of the eraser in the space of the stroke', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 's' });
    action.trigger(cancel);
    await drag(50, -20, 40);

    const [e] = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    // straight down across the stroke, whose box is at y = 6
    expect(e).toEqual({
      shape: 'circle',
      radius: 6,
      points: [50, -26, 50, 34],
    });
  });

  it('saves a square with its axes', async () => {
    const { action, world, cancel, drag } = make({
      config: { size: 12, shape: 'square' },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);
    await drag(50, -20, 40);

    const [e] = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    expect(e.shape).toBe('square');
    expectAxes(e, [6, 0, 0, 6]);
    expect(e.points).toEqual([50, -26, 50, 34]);
  });

  it('reduces the path of a long straight drag to its two ends', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(50, -40);
    for (let y = -35; y <= 60; y += 5) move(50, y);
    await up(50, 60);

    const [e] = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    // two points, from above the ink to below it: the rest of the samples are on the line
    expect(e.points).toHaveLength(4);
    expect(e.points[0]).toBe(50);
    expect(e.points[2]).toBe(50);
    expect(e.points[1]).toBeLessThan(-6);
    expect(e.points[3]).toBeGreaterThan(14);
  });

  it('keeps a curved path within a tenth of a screen pixel', async () => {
    const zoom = 2;
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.stage.scale({ x: zoom, y: zoom });
    const stroke = world.addStroke({ id: 's', x1: 200 });
    action.trigger(cancel);

    const raw: { x: number; y: number }[] = [];
    const at = (i: number) => ({
      x: 10 + i * 1.5,
      y: 10 + 12 * Math.sin(i / 9),
    });
    down(at(0).x, at(0).y);
    for (let i = 1; i < 120; i++) {
      move(at(i).x, at(i).y);
      raw.push({ x: at(i).x, y: at(i).y - stroke.y() });
    }
    await up(at(119).x, at(119).y);

    const [e] = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    expect(e.points.length).toBeLessThan(raw.length * 2);
    const saved = [];
    for (let i = 0; i < e.points.length; i += 2) {
      saved.push({ x: e.points[i], y: e.points[i + 1] });
    }
    const worst = Math.max(...raw.map((p) => distanceToPolyline(p, saved)));
    // a tenth of a screen pixel, in the units of the canvas at this zoom
    expect(worst).toBeLessThanOrEqual(0.1 / zoom + 1e-6);
  });

  it('adds to what was erased before, and leaves that as it was', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const earlier: WeaveStrokeErasure = {
      shape: 'circle',
      radius: 3,
      points: [10, 4],
    };
    world.addStroke({ id: 's', attrs: { erasures: [earlier] } });
    action.trigger(cancel);
    await drag(60, -20, 40);

    const saved = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual(earlier);
    expect(saved[1]).toMatchObject({ shape: 'circle', radius: 6 });
  });

  it('saves one path for each stretch of a drag over a stroke', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(25, 10);
    move(30, 12);
    // another size: the zoom changed on the way
    world.stage.scale({ x: 2, y: 2 });
    move(60, 12);
    await up(60, 12);

    const saved = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    expect(saved).toHaveLength(2);
    expect((saved[0] as { radius: number }).radius).toBe(6);
    expect((saved[1] as { radius: number }).radius).toBe(3);
  });

  it('does not move what is left of a rotated, scaled stroke', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    const stroke = world.addStroke({
      id: 's',
      at: { x: 200, y: 100 },
      rotation: 30,
      scale: 1.5,
    });
    const original = { ...stroke.getAttrs() };
    const toLayer = (p: { x: number; y: number }) =>
      stroke.getTransform().point(p);
    const own = stroke.getAttrs().strokeElements as { x: number; y: number }[];
    action.trigger(cancel);

    // across the middle of the stroke, in layer space
    const middle = toLayer({ x: 50, y: own[0].y });
    down(middle.x - 30, middle.y - 30);
    move(middle.x, middle.y);
    await up(middle.x + 30, middle.y + 30);

    const props = updateOf(world.ops, 's')!.element.props;
    for (const key of [
      'x',
      'y',
      'rotation',
      'scaleX',
      'scaleY',
      'width',
      'height',
    ]) {
      expect(props[key]).toBe(original[key]);
    }
    expect(props.strokeElements).toEqual(original.strokeElements);

    // what was saved, taken back into the layer, is where the eraser went
    const [e] = props.erasures as WeaveStrokeErasure[];
    const first = toLayer({ x: e.points[0], y: e.points[1] });
    const last = toLayer({ x: e.points.at(-2)!, y: e.points.at(-1)! });
    // the saved numbers are rounded to a thousandth of a unit of the stroke
    expect(first.x).toBeCloseTo(middle.x - 30, 2);
    expect(first.y).toBeCloseTo(middle.y - 30, 2);
    // the path ends at the last position the pointer moved to
    expect(last.x).toBeCloseTo(middle.x, 2);
    expect(last.y).toBeCloseTo(middle.y, 2);
    expect((e as { radius: number }).radius).toBeCloseTo(6 / 1.5, 6);
  });

  it('erases the middle of a stroke that has only its two ends as points', async () => {
    // as a straight line is saved once the brush has simplified it
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's', step: 100 });
    expect(stroke.getAttrs().strokeElements).toHaveLength(2);
    action.trigger(cancel);
    await drag(50, -20, 40);

    expect(updateOf(world.ops, 's')).toBeDefined();
    const [e] = updateOf(world.ops, 's')!.element.props
      .erasures as WeaveStrokeErasure[];
    expect(e.points).toEqual([50, -26, 50, 34]);
  });

  it('removes a stroke the eraser covers completely', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 300 },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(-100, 10);
    move(50, 10);
    await up(200, 10);

    expect(world.ops).toHaveLength(1);
    expect(world.ops[0].type).toBe('remove');
    expect(world.order).toEqual([]);
  });

  it('removes a stroke that several drags leave nothing of', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    // earlier erasures took the left of the stroke; this drag takes the rest
    world.addStroke({
      id: 's',
      attrs: {
        erasures: [{ shape: 'circle', radius: 30, points: [-10, 4, 40, 4] }],
      },
    });
    action.trigger(cancel);
    down(45, 10);
    move(105, 10);
    await up(105, 10);

    expect(world.ops.map((o) => o.type)).toEqual(['remove']);
  });

  it('trims the end of a stroke with a single update', async () => {
    const { action, world, cancel, down, up } = make({ config: { size: 20 } });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(100, 10);
    await up(100, 10);

    expect(world.ops).toHaveLength(1);
    expect(updateOf(world.ops, 's')).toBeDefined();
    expect(world.order).toEqual(['s']);
  });

  it('skips a stroke that became locked before the release', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(50, -20);
    move(50, 10);
    stroke.setAttrs({ locked: true });
    await up(50, 40);

    expect(world.ops).toHaveLength(0);
    expect(maskOf(world, stroke)).toBeNull();
  });

  it('never writes a stroke a gesture did not reach', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const untouched = world.addStroke({ id: 'u', y: 300 });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    await drag(50, -20, 40);
    expect(updateOf(world.ops, 'u')).toBeUndefined();
    expect(maskOf(world, untouched)).toBeNull();
  });

  it('writes nothing when the eraser touched no stroke', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 's', y: 300 });
    action.trigger(cancel);
    await drag(50, -20, 40);
    expect(world.ops).toHaveLength(0);
    expect(world.transactions.count).toBe(0);
  });

  it('writes nothing for a stroke whose box the eraser crossed but whose ink it did not touch', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    // a diagonal line: its box is a square, and the eraser goes by a corner of it
    const diagonal = world.addStroke({ id: 'd', width: 4 });
    diagonal.setAttrs({
      width: 100,
      height: 100,
      strokeElements: [
        { x: 0, y: 0, pressure: 1 },
        { x: 100, y: 100, pressure: 1 },
      ],
    });
    action.trigger(cancel);

    down(90, 10);
    move(95, 12);
    expect(maskOf(world, diagonal)).not.toBeNull();
    await up(97, 14);

    expect(world.ops).toHaveLength(0);
    expect(maskOf(world, diagonal)).toBeNull();
  });

  it('changes several strokes of one gesture in one transaction, under one lock', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 'a', y: 10 });
    world.addStroke({ id: 'b', y: 40 });
    world.addStroke({ id: 'c', y: 70 });
    action.trigger(cancel);

    down(50, -10);
    move(50, 40);
    move(50, 100);
    await up(50, 100);

    expect(world.transactions.count).toBe(1);
    expect(world.transactions.opsInside[0]).toBe(3);
    expect(world.locks).toHaveLength(1);
    expect(world.locks[0].operation).toBe(STROKE_ERASER_MUTEX_OPERATION);
    expect([...world.locks[0].nodeIds].sort()).toEqual(['a', 'b', 'c']);
    expect(world.order).toEqual(['a', 'b', 'c']);
  });

  it('writes nothing, and removes the preview, when the lock is refused', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    world.setLockResult(false);
    action.trigger(cancel);

    await drag(50, -20, 40);
    expect(world.ops).toHaveLength(0);
    expect(maskOf(world, stroke)).toBeNull();
  });

  it('keeps the preview until the node takes the saved erase', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);
    await drag(50, -20, 40);

    expect(maskOf(world, stroke)).not.toBeNull();

    // the host renders the written state
    stroke.setAttrs({
      erasures: [{ shape: 'circle', radius: 6, points: [50, -26, 50, 34] }],
    });
    expect(maskOf(world, stroke)).toBeNull();
  });

  it('removes the preview even if the node is never updated', async () => {
    vi.useFakeTimers();
    try {
      const { action, world, cancel, down, move, up } = make({
        config: { size: 12 },
      });
      const stroke = world.addStroke({ id: 's' });
      action.trigger(cancel);
      down(50, -20);
      move(50, 10);
      void up(50, 40);
      await vi.advanceTimersByTimeAsync(10);
      expect(maskOf(world, stroke)).not.toBeNull();
      await vi.advanceTimersByTimeAsync(1000);
      expect(maskOf(world, stroke)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets props change the size while the tool is registered', () => {
    const { action, world, cancel, down } = make({ config: { size: 10 } });
    const stroke = world.addStroke({ id: 's' });
    action.updateProps({ size: 30 });
    action.trigger(cancel);
    down(50, 10);
    expect((chainsOf(world, stroke)![0] as { radius: number }).radius).toBe(15);
  });
});

// ─── every brush instrument, at several zooms ────────────────────────────────

describe('strokes of every brush instrument', () => {
  const instruments = createBrushInstruments(8);

  describe.each(instruments.map((i) => [i.id, i] as const))(
    '%s',
    (_id, instrument) => {
      it.each([0.25, 1, 4])(
        'can be erased at zoom %s, and is saved as it was',
        async (zoom) => {
          const { action, world, cancel, down, move, up } = make({
            config: { size: 24 },
          });
          world.stage.scale({ x: zoom, y: zoom });
          // a stroke as long on screen at every zoom, drawn across by the eraser
          const k = 1 / zoom;
          const stroke = world.addStroke({
            id: 's',
            x1: 100 * k,
            y: 10 * k,
            step: k,
            attrs: {
              look: instrument.look,
              ...instrument.props,
            },
          });
          const before = world.handler.serialize(stroke as never).props;
          action.trigger(cancel);

          down(50 * k, -20 * k);
          move(50 * k, 10 * k);
          move(50 * k, 40 * k);
          await up(50 * k, 40 * k);

          expect(world.ops).toHaveLength(1);
          const { erasures, ...rest } = updateOf(world.ops, 's')!.element.props;
          // every point, the look and every other attribute: exactly as they were
          expect(rest).toEqual(before);
          expect(erasures).toHaveLength(1);
          expect((erasures as { radius: number }[])[0].radius).toBeCloseTo(
            12 * k,
            9
          );
        }
      );
    }
  );
});

// ─── touch, pens and several pointers ────────────────────────────────────────

describe('touch and pen input', () => {
  const fire = (
    world: World,
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    x: number,
    y: number,
    pointer: { pointerId?: number; pointerType?: string } = {}
  ) => {
    world.pointTo(x, y);
    world.stage.fire(type, {
      evt: { pointerType: 'touch', button: 0, pointerId: 1, ...pointer },
    });
  };

  it('keeps the browser from scrolling or zooming under a dragging finger or pen', () => {
    const { action, world, cancel } = make();
    world.stage.container().style.touchAction = 'pan-y';

    action.trigger(cancel);
    expect(world.stage.container().style.touchAction).toBe('none');

    // triggering again must not take 'none' for what was there before
    action.trigger(cancel);
    action.cleanup();
    expect(world.stage.container().style.touchAction).toBe('pan-y');
  });

  it('leaves the touch action alone when it never took it', () => {
    const { action, world } = make();
    world.stage.container().style.touchAction = 'manipulation';
    action.cleanup();
    expect(world.stage.container().style.touchAction).toBe('manipulation');
  });

  it('erases with a finger that is the only pointer', async () => {
    const { action, world, cancel } = make({ config: { size: 12 } });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    fire(world, 'pointerdown', 50, -20);
    fire(world, 'pointermove', 50, 10);
    fire(world, 'pointermove', 50, 40);
    fire(world, 'pointerup', 50, 40);
    await flush();

    expect(updateOf(world.ops, 's')).toBeDefined();
  });

  it('is not ended, nor moved, by another pointer', async () => {
    const { action, world, cancel } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    fire(world, 'pointerdown', 50, -20, { pointerId: 1 });
    fire(world, 'pointermove', 50, 10, { pointerId: 1 });
    const before = [...chainsOf(world, stroke)![0].points];

    // a second finger moves and lifts
    fire(world, 'pointermove', 80, 10, { pointerId: 2 });
    fire(world, 'pointerup', 80, 10, { pointerId: 2 });
    await flush();
    expect(world.ops).toHaveLength(0);
    expect(chainsOf(world, stroke)![0].points).toEqual(before);

    fire(world, 'pointermove', 50, 40, { pointerId: 1 });
    fire(world, 'pointerup', 50, 40, { pointerId: 1 });
    await flush();
    expect(world.ops.length).toBeGreaterThan(0);
  });

  it('does not start while a pinch is under way, and drops an erase a pinch turns into', async () => {
    const { action, world, cancel } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    let pinching = true;
    (world.instance.getPlugin as ReturnType<typeof vi.fn>).mockImplementation(
      (name: string) =>
        name === 'stageZoom' ? { isPinching: () => pinching } : undefined
    );
    action.trigger(cancel);

    fire(world, 'pointerdown', 50, 10);
    expect(maskOf(world, stroke)).toBeNull();

    pinching = false;
    fire(world, 'pointerdown', 50, 10);
    expect(maskOf(world, stroke)).not.toBeNull();

    pinching = true;
    fire(world, 'pointermove', 60, 10);
    expect(maskOf(world, stroke)).toBeNull();

    fire(world, 'pointerup', 60, 10);
    await flush();
    expect(world.ops).toHaveLength(0);
  });

  it('drops the erase when the browser cancels the pointer', async () => {
    const { action, world, cancel } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    fire(world, 'pointerdown', 50, 10);
    expect(maskOf(world, stroke)).not.toBeNull();
    const cancelled = new Event('pointercancel');
    Object.assign(cancelled, { pointerId: 1 });
    window.dispatchEvent(cancelled);

    expect(maskOf(world, stroke)).toBeNull();
    fire(world, 'pointerup', 50, 10);
    await flush();
    expect(world.ops).toHaveLength(0);
  });
});

// ─── when the write fails, and quick erases one after another ────────────────

describe('failing and repeating', () => {
  it('takes the previews off, and does not leave the lock held, when the write fails', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    const stroke = world.addStroke({ id: 's' });
    const error = vi.fn();
    (action as unknown as { logger: unknown }).logger = { error };

    let held = 0;
    const acquire = world.instance.acquireMutexLock;
    world.instance.acquireMutexLock = async (lock, run) => {
      held++;
      await acquire(lock, run);
      held--;
    };
    world.instance.stateTransactional = () => {
      throw new Error('the document is gone');
    };
    action.trigger(cancel);

    down(50, -20);
    move(50, 10);
    move(50, 40);
    await up(50, 40);

    expect(maskOf(world, stroke)).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(held).toBe(0);
  });

  it('is ready for the next erase after one that failed', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 's' });
    (action as unknown as { logger: unknown }).logger = { error: vi.fn() };
    const write = world.instance.stateTransactional;
    world.instance.stateTransactional = () => {
      throw new Error('boom');
    };
    action.trigger(cancel);
    await drag(50, -20, 40);

    world.instance.stateTransactional = write;
    await drag(50, -20, 40);
    expect(updateOf(world.ops, 's')).toBeDefined();
  });

  it('does not erase a stroke again until the host has taken its last erase', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    await drag(50, -20, 40);
    expect(maskOf(world, stroke)).not.toBeNull();
    const writes = world.ops.length;

    // a second drag, while the node still has the erasures it had
    await drag(20, -20, 40);
    expect(world.ops).toHaveLength(writes);
    expect(maskOf(world, stroke)).not.toBeNull();

    // the host renders the saved erase
    stroke.setAttrs({
      erasures: [{ shape: 'circle', radius: 6, points: [50, -26, 50, 34] }],
    });
    expect(maskOf(world, stroke)).toBeNull();

    await drag(5, -20, 40);
    expect(world.ops.length).toBeGreaterThan(writes);
  });

  it('lets a stroke be erased again once the wait is over, even if the host never answers', async () => {
    vi.useFakeTimers();
    try {
      const { action, world, cancel, down, move, up } = make({
        config: { size: 12 },
      });
      const stroke = world.addStroke({ id: 's' });
      action.trigger(cancel);
      down(50, -20);
      move(50, 10);
      void up(50, 40);
      await vi.advanceTimersByTimeAsync(2000);
      expect(maskOf(world, stroke)).toBeNull();

      down(10, 10);
      expect(maskOf(world, stroke)).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
