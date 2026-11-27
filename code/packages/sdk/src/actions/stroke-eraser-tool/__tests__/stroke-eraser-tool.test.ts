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

// ─── 4.1 registration and lifecycle ──────────────────────────────────────────

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
    expect(world.utilityLayer.getChildren()[0].getChildren()).toHaveLength(2);
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

// ─── 4.2 pointer handling ────────────────────────────────────────────────────

describe('pointer handling', () => {
  it('sizes the eraser in screen pixels, whatever the zoom', () => {
    for (const zoom of [1, 4, 0.5]) {
      const { action, world, cancel, down } = make({ config: { size: 24 } });
      world.stage.scale({ x: zoom, y: zoom });
      const stroke = world.addStroke({ id: 's' });
      action.trigger(cancel);

      down(50, 10);
      // 12 screen px of radius is 12 / zoom canvas units
      expect(maskOf(world, stroke)![0].r).toBeCloseTo(12 / zoom, 9);
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
    const radii = maskOf(world, stroke)!.map((c) => c.r);
    expect(radii).toEqual([10, 5]);
  });

  it('joins samples with capsules, so a fast drag does not skip a stroke', () => {
    const { action, world, cancel, down, move } = make({ config: { size: 4 } });
    const stroke = world.addStroke({ id: 's', y: 100 });
    action.trigger(cancel);

    down(50, 0);
    move(50, 400);
    const mask = maskOf(world, stroke)!;
    // from one end of the drag step to the other, in the space of the stroke
    expect(mask.at(-1)!.a).toEqual({ x: 50, y: 0 - stroke.y() });
    expect(mask.at(-1)!.b).toEqual({ x: 50, y: 400 - stroke.y() });
  });

  it('gives the capsules in the space of the stroke', () => {
    const { action, world, cancel, down } = make({ config: { size: 8 } });
    const stroke = world.addStroke({ id: 's', at: { x: 100, y: 200 } });
    action.trigger(cancel);

    down(130, 204);
    expect(maskOf(world, stroke)![0].a).toEqual({ x: 30, y: 4 });
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

// ─── 4.3 preview: what can be erased ─────────────────────────────────────────

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

  it('leaves the preview of a stroke being handed over alone', () => {
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
    const c = maskOf(world, shape)![0];
    expect(c.a.x).toBeCloseTo(50, 6);
    expect(c.a.y).toBeCloseTo(4, 6);
  });
});

// ─── 4.5 commit ──────────────────────────────────────────────────────────────

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

  it('keeps the id on the first piece and adds the other under the same parent', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 'below', y: 150 });
    world.addStroke({ id: 's' });
    world.addStroke({ id: 'above', y: 200 });
    action.trigger(cancel);

    await drag(50, -20, 40);

    const update = updateOf(world.ops, 's')!;
    const adds = addsOf(world.ops);
    expect(update.element.key).toBe('s');
    expect(update.element.props.id).toBe('s');
    expect(adds).toHaveLength(1);
    expect(adds[0].element.key).not.toBe('s');
    expect(adds[0].element.props.id).toBe(adds[0].element.key);
    expect(adds[0].parentId).toBe('mainLayer');
  });

  it('puts the extra pieces at the position of the stroke, below what was above it', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 'below', y: 150 });
    world.addStroke({ id: 's' });
    world.addStroke({ id: 'above', y: 200 });
    action.trigger(cancel);

    await drag(50, -20, 40);

    const extra = addsOf(world.ops)[0].element.key;
    expect(world.order).toEqual(['below', 's', extra, 'above']);
  });

  it('splits a stroke cut twice into three pieces', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(25, -20);
    move(25, 10);
    move(25, 40);
    move(75, 40);
    move(75, 10);
    await up(75, -20);

    expect(addsOf(world.ops)).toHaveLength(2);
    expect(world.order).toHaveLength(3);
    expect(world.order[0]).toBe('s');
  });

  it('keeps look, colour, width and the other attributes on every piece', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const look = { version: 1, outline: 'round' };
    world.addStroke({
      id: 's',
      width: 10,
      attrs: {
        look,
        inputMeta: { profile: 'mouse' },
        opacity: 0.75,
        globalCompositeOperation: 'multiply',
        dash: [4, 4],
        isEraser: false,
      },
    });
    action.trigger(cancel);
    await drag(50, -20, 40);

    for (const op of world.ops) {
      if (op.type === 'remove') continue;
      const p = op.element.props;
      expect(p.stroke).toBe('#000000ff');
      expect(p.strokeWidth).toBe(10);
      expect(p.opacity).toBe(0.75);
      expect(p.globalCompositeOperation).toBe('multiply');
      expect(p.dash).toEqual([4, 4]);
      expect(p.inputMeta).toEqual({ profile: 'mouse' });
      expect(p.look).toEqual(look);
      expect(p.nodeType).toBe('stroke');
      expect(p).not.toHaveProperty('eraseMask');
    }
  });

  it('gives each piece its own box and stores its points relative to it', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    world.addStroke({ id: 's', width: 8, y: 10 });
    action.trigger(cancel);
    await drag(50, -20, 40);

    const first = updateOf(world.ops, 's')!.element.props;
    const second = addsOf(world.ops)[0].element.props;

    expect(first.x).toBeCloseTo(0, 6);
    expect(first.width).toBeLessThan(50);
    expect(second.x).toBeGreaterThan(50);
    expect(second.width).toBeLessThan(50);
    for (const props of [first, second]) {
      expect(props.height).toBeGreaterThanOrEqual(8);
      const pts = props.strokeElements as { x: number; y: number }[];
      expect(Math.min(...pts.map((p) => p.x))).toBeGreaterThanOrEqual(0);
    }
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
    const toWorld = (shape: Konva.Node, p: { x: number; y: number }) =>
      shape.getTransform().point(p);

    const own = stroke.getAttrs().strokeElements as { x: number; y: number }[];
    const originalFirst = toWorld(stroke, own[0]);
    const originalLast = toWorld(stroke, own.at(-1)!);
    action.trigger(cancel);

    // across the middle of the stroke, in layer space
    const middle = toWorld(stroke, { x: 50, y: own[0].y });
    down(middle.x - 30, middle.y - 30);
    move(middle.x, middle.y);
    await up(middle.x + 30, middle.y + 30);

    const piece = (props: Record<string, unknown>, which: 'first' | 'last') => {
      const shape = new Konva.Shape({
        x: props.x as number,
        y: props.y as number,
        rotation: props.rotation as number,
        scaleX: props.scaleX as number,
        scaleY: props.scaleY as number,
      });
      const pts = props.strokeElements as { x: number; y: number }[];
      return toWorld(shape, which === 'first' ? pts[0] : pts.at(-1)!);
    };

    const first = updateOf(world.ops, 's')!.element.props;
    const last = addsOf(world.ops)[0].element.props;

    const a = piece(first, 'first');
    expect(a.x).toBeCloseTo(originalFirst.x, 4);
    expect(a.y).toBeCloseTo(originalFirst.y, 4);
    const b = piece(last, 'last');
    expect(b.x).toBeCloseTo(originalLast.x, 4);
    expect(b.y).toBeCloseTo(originalLast.y, 4);
    expect(first.rotation).toBe(30);
    expect(first.scaleX).toBe(1.5);
    expect(last.rotation).toBe(30);
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

  it('trims the end of a stroke with a single update and no new piece', async () => {
    const { action, world, cancel, down, up } = make({ config: { size: 20 } });
    world.addStroke({ id: 's' });
    action.trigger(cancel);

    down(100, 10);
    await up(100, 10);

    expect(addsOf(world.ops)).toHaveLength(0);
    expect(updateOf(world.ops, 's')).toBeDefined();
    expect(world.order).toEqual(['s']);
  });

  it('drops a piece too short to be seen', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 20, minPieceLengthPx: 6 },
    });
    // 8 units of stroke to the right of the first cut, which a second cut takes
    world.addStroke({ id: 's', step: 1, width: 2 });
    action.trigger(cancel);

    down(20, -20);
    move(20, 40);
    move(45, 40);
    move(45, -20);
    await up(45, -20);

    // what is left of the middle (about 5 units) is shorter than 6
    const keys = world.ops.flatMap((o) =>
      o.type === 'remove' ? [] : [o.element.key]
    );
    expect(keys).toHaveLength(2);
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
    expect(world.transactions.opsInside[0]).toBeGreaterThanOrEqual(6);
    expect(world.locks).toHaveLength(1);
    expect(world.locks[0].operation).toBe(STROKE_ERASER_MUTEX_OPERATION);
    expect([...world.locks[0].nodeIds].sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the order of strokes when several are split', async () => {
    const { action, world, cancel, down, move, up } = make({
      config: { size: 12 },
    });
    world.addStroke({ id: 'a', y: 10 });
    world.addStroke({ id: 'b', y: 40 });
    action.trigger(cancel);

    down(50, -10);
    move(50, 25);
    move(50, 60);
    await up(50, 60);

    const added = addsOf(world.ops).map((o) => o.element.key);
    expect(added).toHaveLength(2);
    expect(world.order).toEqual(['a', added[0], 'b', added[1]]);
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

  it('keeps the preview until the node takes the committed stroke', async () => {
    const { action, world, cancel, drag } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);
    await drag(50, -20, 40);

    expect(maskOf(world, stroke)).not.toBeNull();

    // the host renders the written state
    stroke.setAttrs({
      strokeElements: [{ x: 0, y: 0, pressure: 1 }],
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

  it('finalizes the points of the pieces with the configured override', async () => {
    const dense = make({
      config: { size: 12, finalize: { mode: 'none' } },
    });
    dense.world.addStroke({ id: 's', step: 1 });
    dense.action.trigger(dense.cancel);
    await dense.drag(50, -20, 40);
    const kept = (
      updateOf(dense.world.ops, 's')!.element.props.strokeElements as unknown[]
    ).length;

    const reduced = make({ config: { size: 12 } });
    reduced.world.addStroke({ id: 's', step: 1 });
    reduced.action.trigger(reduced.cancel);
    await reduced.drag(50, -20, 40);
    const fewer = (
      updateOf(reduced.world.ops, 's')!.element.props
        .strokeElements as unknown[]
    ).length;

    expect(fewer).toBeLessThan(kept);
  });

  it('lets props change the size while the tool is registered', () => {
    const { action, world, cancel, down } = make({ config: { size: 10 } });
    const stroke = world.addStroke({ id: 's' });
    action.updateProps({ size: 30 });
    action.trigger(cancel);
    down(50, 10);
    expect(maskOf(world, stroke)![0].r).toBe(15);
  });
});

// ─── every brush instrument, at several zooms ────────────────────────────────

describe('strokes of every brush instrument', () => {
  const instruments = createBrushInstruments(8);

  describe.each(instruments.map((i) => [i.id, i] as const))(
    '%s',
    (_id, instrument) => {
      it.each([0.25, 1, 4])('can be cut at zoom %s', async (zoom) => {
        const { action, world, cancel, down, move, up } = make({
          config: { size: 24 },
        });
        world.stage.scale({ x: zoom, y: zoom });
        // a stroke as long on screen at every zoom, drawn across by the eraser
        const k = 1 / zoom;
        world.addStroke({
          id: 's',
          x1: 100 * k,
          y: 10 * k,
          step: k,
          attrs: {
            look: instrument.look,
            ...instrument.props,
          },
        });
        action.trigger(cancel);

        down(50 * k, -20 * k);
        move(50 * k, 10 * k);
        move(50 * k, 40 * k);
        await up(50 * k, 40 * k);

        const update = updateOf(world.ops, 's')!;
        const adds = addsOf(world.ops);
        expect(update).toBeDefined();
        expect(adds).toHaveLength(1);

        for (const op of [update, ...adds]) {
          const pts = op.element.props.strokeElements as { pressure: number }[];
          expect(pts.length).toBeGreaterThanOrEqual(2);
          expect(op.element.props.look).toBeDefined();
          expect(op.element.props.strokeWidth).toBe(8);
        }
        // the piece that ends at the cut has no end taper
        const width = (
          update.element.props.look as { width?: { taperEnd?: number } }
        ).width;
        expect(width?.taperEnd ?? 0).toBe(0);
      });
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

    expect(addsOf(world.ops)).toHaveLength(1);
  });

  it('is not ended, nor moved, by another pointer', async () => {
    const { action, world, cancel } = make({ config: { size: 12 } });
    const stroke = world.addStroke({ id: 's' });
    action.trigger(cancel);

    fire(world, 'pointerdown', 50, -20, { pointerId: 1 });
    fire(world, 'pointermove', 50, 10, { pointerId: 1 });
    const before = maskOf(world, stroke)!.length;

    // a second finger moves and lifts
    fire(world, 'pointermove', 80, 10, { pointerId: 2 });
    fire(world, 'pointerup', 80, 10, { pointerId: 2 });
    await flush();
    expect(world.ops).toHaveLength(0);
    expect(maskOf(world, stroke)!.length).toBe(before);

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

    // a second drag, while the node still has the points of the first
    await drag(20, -20, 40);
    expect(world.ops.length).toBe(writes);
    expect(maskOf(world, stroke)).not.toBeNull();

    // the host renders the committed stroke
    stroke.setAttrs({
      strokeElements: [
        { x: 0, y: 4, pressure: 1 },
        { x: 10, y: 4, pressure: 1 },
      ],
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

// ─── what is left of a stroke does not change when it is saved ───────────────

describe('pieces stay faithful to the stroke they were cut from', () => {
  const penLook = createBrushInstruments(6).find((i) => i.id === 'pen')!.look;

  // The time the pieces may take is a limit on the work, not a part of what is
  // saved: how long the machine takes, which depends on what else it is doing,
  // must not change the result. The clock does not move, so the limit never comes.
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Erases the middle of a wavy stroke and measures, in the space of the node,
   * how far the first piece that is written is from the part of the stroke it
   * was cut from. Positions only: a piece has no taper at its cut end.
   */
  const shiftOfFirstPiece = async (
    config: Parameters<typeof make>[0],
    extra: Record<string, unknown>,
    // a hairline, so the bound is the one asked for: a broad stroke is allowed more
    width = 2
  ) => {
    const { action, world, cancel, down, move, up } = make(config);
    const stroke = world.addStroke({
      id: 's',
      step: 1,
      x1: 400,
      width,
      attrs: extra,
    });
    // wavy, so that reducing its points has something to lose
    const wavy = (stroke.getAttrs().strokeElements as { x: number }[]).map(
      (p, i) => ({
        x: p.x,
        y: 8 + 3 * Math.sin(i / 17) + 1.5 * Math.sin(i / 5),
        pressure: 0.5 + 0.3 * Math.sin(i / 40),
      })
    );
    stroke.setAttrs({ strokeElements: wavy, height: 16 });
    action.trigger(cancel);

    down(200, -20);
    move(200, 8);
    move(200, 40);
    // what the preview shows of the stroke, before it is written
    const shown = world.handler.cutStrokeWithMask(
      stroke,
      maskOf(world, stroke)!
    )!;
    await up(200, 40);

    const props = updateOf(world.ops, 's')!.element.props;
    const geometry = world.handler.getRenderedGeometry({
      getAttrs: () => ({ ...stroke.getAttrs(), ...props }),
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node)!;

    // the piece is drawn at its own x and y, the stroke at its own
    const dx = (props.x as number) - stroke.x();
    const dy = (props.y as number) - stroke.y();
    const piece = geometry.centerline.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
    const original = shown.runs[0].points.map((p) => ({ x: p.x, y: p.y }));

    // distance from a point to a line made of segments
    const distance = (
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

    // The curve through the points of a piece ends where the piece ends, while
    // the original goes on: near a cut it bends differently, which no choice of
    // points can change. So the interior and the last stretch are told apart.
    const cutAt = original.at(-1)!.x;
    const apart = (keep: (x: number) => boolean) =>
      Math.max(
        ...piece.filter((p) => keep(p.x)).map((p) => distance(p, original)),
        ...original.filter((p) => keep(p.x)).map((p) => distance(p, piece))
      );

    return {
      pieces: 1 + addsOf(world.ops).length,
      points: (props.strokeElements as unknown[]).length,
      interior: apart((x) => x < cutAt - 20),
      wholePiece: apart(() => true),
    };
  };

  it.each([
    ['a stroke with a look', { look: penLook }],
    ['a stroke with no look', {}],
  ])(
    'keeps what is left of %s within a quarter of a pixel',
    async (_name, extra) => {
      const kept = await shiftOfFirstPiece({ config: { size: 12 } }, extra);
      expect(kept.pieces).toBe(2);
      expect(kept.interior).toBeLessThanOrEqual(0.25 + 0.05);
      // the cut end bends a little differently, by a fraction of a pixel
      expect(kept.wholePiece).toBeLessThanOrEqual(0.5);
    }
  );

  it('is what keeps them there: without the bound the same stroke is moved more', async () => {
    const loose = await shiftOfFirstPiece(
      { config: { size: 12, finalize: { maxDeviationPx: 0 } } },
      { look: penLook }
    );
    const kept = await shiftOfFirstPiece(
      { config: { size: 12 } },
      { look: penLook }
    );
    expect(loose.interior).toBeGreaterThan(0.35);
    expect(kept.interior).toBeLessThan(loose.interior);
    // and it costs points
    expect(kept.points).toBeGreaterThan(loose.points);
  });

  it('lets a broad stroke move more, as the brush does', async () => {
    const hairline = await shiftOfFirstPiece(
      { config: { size: 12 } },
      { look: penLook },
      2
    );
    const broad = await shiftOfFirstPiece(
      { config: { size: 12 } },
      { look: penLook },
      24
    );
    expect(broad.points).toBeLessThan(hairline.points);
    expect(broad.interior).toBeLessThanOrEqual(0.25 * 4 + 0.05);
  });

  it('can be asked for a different bound', async () => {
    const tight = await shiftOfFirstPiece(
      { config: { size: 12, finalize: { maxDeviationPx: 0.08 } } },
      { look: penLook }
    );
    expect(tight.interior).toBeLessThanOrEqual(0.08 + 0.05);
  });
});
