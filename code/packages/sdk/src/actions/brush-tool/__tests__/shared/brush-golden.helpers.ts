// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';
import { WeaveBrushToolAction } from '../../brush-tool';
import type { WeaveBrushToolActionParams } from '../../types';

type Sample = { x: number; y: number; pressure: number; t?: number };

export type GestureStep =
  | {
      type: 'down';
      t: number;
      x: number;
      y: number;
      pressure: number;
      pointerType: string;
      pointerId?: number;
    }
  | {
      type: 'move';
      t: number;
      x: number;
      y: number;
      pressure: number;
      pointerType: string;
      pointerId?: number;
      coalesced?: Sample[];
      predicted?: Sample[];
    }
  | { type: 'pinch'; on: boolean }
  | { type: 'up'; t: number; pointerId?: number; pointerType?: string }
  /** Lets time pass, so timers set by the tool can fire. */
  | { type: 'wait'; t: number };

export type Gesture = { name: string; steps: GestureStep[] };

/** Affine transform with Konva's semantics: x' = a x + c y + e, y' = b x + d y + f. */
export class TestTransform {
  constructor(public m: [number, number, number, number, number, number]) {}

  copy() {
    return new TestTransform([...this.m]);
  }

  invert() {
    const [a, b, c, d, e, f] = this.m;
    const det = a * d - b * c;
    this.m = [
      d / det,
      -b / det,
      -c / det,
      a / det,
      (c * f - d * e) / det,
      (b * e - a * f) / det,
    ];
    return this;
  }

  point(p: { x: number; y: number }) {
    const [a, b, c, d, e, f] = this.m;
    return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
  }
}

/** How the fake stage maps client coordinates to the stroke container. */
export type StageEnv = {
  rect: { left: number; top: number; width: number; height: number };
  clientWidth: number;
  clientHeight: number;
  /** Absolute transform of the stroke container. */
  transform: [number, number, number, number, number, number];
  /** Stage zoom; 1 when omitted. */
  zoom?: number;
};

export const IDENTITY_ENV: StageEnv = {
  rect: { left: 0, top: 0, width: 100, height: 100 },
  clientWidth: 100,
  clientHeight: 100,
  transform: [1, 0, 0, 1, 0, 0],
};

/** Composes two transforms: `outer` applied after `inner`. */
export const composeTransforms = (
  outer: StageEnv['transform'],
  inner: StageEnv['transform']
): StageEnv['transform'] => {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

export type GestureResult = {
  live: Sample[];
  persisted: {
    x: number;
    y: number;
    width: number;
    height: number;
    strokeElements: Sample[];
  } | null;
  state: string;
  profileKey: string;
  /** The look saved on the persisted stroke, if any. */
  persistedLook: unknown;
  /** How the persisted stroke says it was drawn, if it does. */
  persistedMeta: unknown;
  /** Times the tool wrote the stage's shared pointer position. */
  stagePointerWrites: number;
  /** How many strokes the tool started. */
  strokesCreated: number;
};

const round = (n: number) => Math.round(n * 1e4) / 1e4;
const roundSamples = (pts: Sample[]) =>
  pts.map((p) => ({
    x: round(p.x),
    y: round(p.y),
    pressure: round(p.pressure),
  }));

/**
 * Runs a recorded gesture through the brush tool against a stateful fake
 * stage, a controlled clock and the real simplification. The pointer position
 * seen by the tool is the last dispatched event's, as with a real stage.
 */
export function runGesture(
  gesture: Gesture,
  params?: WeaveBrushToolActionParams,
  /** Called before each step, with the action, to change it mid-gesture. */
  beforeStep?: (action: WeaveBrushToolAction, index: number) => void,
  env: StageEnv = IDENTITY_ENV,
  /** Plugins the instance reports, by name. */
  plugins: Record<string, unknown> = {}
): GestureResult {
  let clock = 0;
  const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const previousAddEventListener = (globalThis as Record<string, unknown>)[
    'addEventListener'
  ];
  (globalThis as Record<string, unknown>)['addEventListener'] = vi.fn();

  let pinching = false;
  let current = { x: 0, y: 0 };
  let strokeNode: ReturnType<typeof makeNode> | undefined;
  let persisted: GestureResult['persisted'] = null;
  let persistedLook: unknown;
  let persistedMeta: unknown;
  let stagePointerWrites = 0;
  let strokesCreated = 0;

  function makeNode(props: Record<string, unknown>) {
    const attrs: Record<string, unknown> = { ...props };
    return {
      getAttrs: () => ({ ...attrs }),
      setAttrs: (a: Record<string, unknown>) => {
        Object.assign(attrs, a);
      },
      x: () => (attrs['x'] as number) ?? 0,
      y: () => (attrs['y'] as number) ?? 0,
      destroy: () => {
        if (strokeNode && strokeNode.getAttrs() === attrs) strokeNode = undefined;
      },
    };
  }

  const handlers: Record<string, (e: unknown) => void> = {};
  const container = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '', touchAction: 'auto' },
  };
  const stage = {
    container: () => container,
    on: (event: string, handler: (e: unknown) => void) => {
      handlers[event] = handler;
    },
    findOne: (selector: string) => {
      const id = selector.slice(1);
      return strokeNode && strokeNode.getAttrs()['id'] === id
        ? strokeNode
        : undefined;
    },
    scaleX: () => env.zoom ?? 1,
    getContent: () => ({
      getBoundingClientRect: () => env.rect,
      clientWidth: env.clientWidth,
      clientHeight: env.clientHeight,
    }),
    setPointersPositions: (evt: { clientX: number; clientY: number }) => {
      stagePointerWrites++;
      current = { x: evt.clientX, y: evt.clientY };
    },
  };
  const measureContainer = {
    add: vi.fn(),
    getAttrs: () => ({ id: 'main' }),
    getAbsoluteTransform: () => new TestTransform(env.transform),
  };

  /** What the stage does with its own pointer position (client coordinates). */
  const stagePointToContainer = (client: { x: number; y: number }) =>
    new TestTransform(env.transform).invert().point({
      x: (client.x - env.rect.left) / (env.rect.width / env.clientWidth || 1),
      y: (client.y - env.rect.top) / (env.rect.height / env.clientHeight || 1),
    });
  const nodeHandler = {
    create: (id: string, props: Record<string, unknown>) => {
      strokesCreated++;
      return { props: { ...props, id, nodeType: 'stroke' } };
    },
    onRender: (props: Record<string, unknown>) => {
      strokeNode = makeNode(props);
      return strokeNode;
    },
    onUpdate: vi.fn(),
    serialize: (node: { getAttrs: () => Record<string, unknown> }) => ({
      key: node.getAttrs()['id'],
      type: 'stroke',
      props: node.getAttrs(),
    }),
  };

  const instance = {
    getStage: () => stage,
    getPlugin: (name: string) =>
      name === 'stageZoom' ? { isPinching: () => pinching } : plugins[name],
    getNodeHandler: () => nodeHandler,
    getActiveAction: () => 'brushTool',
    getEventsController: () => ({ signal: new AbortController().signal }),
    getMousePointer: () => ({
      mousePoint: stagePointToContainer(current),
      container: { getAttrs: () => ({ id: 'main' }) },
      measureContainer,
    }),
    getMousePointerRelativeToContainer: () => ({
      mousePoint: stagePointToContainer(current),
    }),
    addNode: (node: {
      props: {
        x: number;
        y: number;
        width: number;
        height: number;
        strokeElements: Sample[];
        look?: unknown;
        inputMeta?: unknown;
      };
    }) => {
      const p = node.props;
      persistedLook = (p as { look?: unknown }).look;
      persistedMeta = (p as { inputMeta?: unknown }).inputMeta;
      persisted = {
        x: round(p.x),
        y: round(p.y),
        width: round(p.width),
        height: round(p.height),
        strokeElements: roundSamples(p.strokeElements),
      };
    },
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
  };

  const action = new WeaveBrushToolAction(params);
  (action as unknown as Record<string, unknown>)['instance'] = instance;
  (action as unknown as Record<string, unknown>)['cancelAction'] = vi.fn();
  action.trigger(vi.fn());

  const evt = (
    s: Sample & { pointerType: string },
    extra: Record<string, unknown> = {}
  ) => ({
    evt: {
      timeStamp: s.t,
      pointerId: (s as { pointerId?: number }).pointerId,
      clientX: s.x,
      clientY: s.y,
      button: 0,
      pointerType: s.pointerType,
      pressure: s.pressure,
      stopPropagation: vi.fn(),
      ...extra,
    },
  });
  const raw = (s: Sample, pointerType: string) => ({
    timeStamp: s.t,
    clientX: s.x,
    clientY: s.y,
    pressure: s.pressure,
    pointerType,
  });

  let live: Sample[] = [];
  const readLive = () => {
    if (strokeNode)
      live = roundSamples(
        strokeNode.getAttrs()['strokeElements'] as Sample[]
      );
  };

  let lastTime = 0;
  for (const [index, step] of gesture.steps.entries()) {
    beforeStep?.(action, index);
    if (step.type === 'pinch') {
      pinching = step.on;
      continue;
    }
    // Timers fire between steps, as they would between real events.
    if (vi.isFakeTimers()) {
      vi.advanceTimersByTime(Math.max(0, step.t - lastTime));
    }
    lastTime = step.t;
    if (step.type === 'wait') {
      clock = step.t;
      continue;
    }
    if (step.type === 'up') {
      clock = step.t;
      handlers['pointerup'](
        evt({
          x: 0,
          y: 0,
          pressure: 0,
          pointerType: step.pointerType ?? 'mouse',
          pointerId: step.pointerId,
          t: step.t,
        } as never)
      );
      continue;
    }
    clock = step.t;
    current = { x: step.x, y: step.y };
    if (step.type === 'down') {
      handlers['pointerdown'](evt(step));
      readLive();
      continue;
    }
    const extra: Record<string, unknown> = {};
    if (step.coalesced)
      extra['getCoalescedEvents'] = () =>
        step.coalesced!.map((s) => raw(s, step.pointerType));
    if (step.predicted)
      extra['getPredictedEvents'] = () =>
        step.predicted!.map((s) => raw(s, step.pointerType));
    handlers['pointermove'](evt(step, extra));
    readLive();
  }

  const result: GestureResult = {
    live,
    persisted,
    state: (action as unknown as { state: string }).state,
    profileKey: action.getActiveProfileKey(),
    persistedLook,
    persistedMeta,
    stagePointerWrites,
    strokesCreated,
  };
  nowSpy.mockRestore();
  (globalThis as Record<string, unknown>)['addEventListener'] =
    previousAddEventListener;
  return result;
}

// ─── deterministic gestures ────────────────────────────────────────────────

const cursive = (i: number, n: number, ox: number, oy: number) => {
  const th = (i / n) * 4 * 2 * Math.PI;
  return { x: ox + 4 * th - 8 * Math.sin(th), y: oy - 8 * Math.cos(th) };
};

function mouseCurve(): Gesture {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 100, y: 100, pressure: 0, pointerType: 'mouse' },
  ];
  for (let i = 1; i <= 12; i++) {
    steps.push({
      type: 'move',
      t: i * 16,
      x: 100 + i * 6,
      y: 100 + 20 * Math.sin(i / 2),
      pressure: 0,
      pointerType: 'mouse',
    });
  }
  steps.push({ type: 'up', t: 12 * 16 + 8 });
  return { name: 'mouse-curve', steps };
}

function pen60Coalesced(): Gesture {
  const frames = 24;
  const per = 3;
  const total = frames * per;
  const sample = (k: number): Sample => {
    const p = cursive(k, total, 200, 200);
    const t = k / total;
    const pressure =
      t < 0.1 ? 0.1 + t * 5 : t > 0.9 ? Math.max(0, (1 - t) * 5) : 0.45;
    return { x: p.x, y: p.y, pressure };
  };
  const first = sample(0);
  const steps: GestureStep[] = [
    { type: 'down', t: 0, ...first, pointerType: 'pen' },
  ];
  for (let f = 0; f < frames; f++) {
    const co = [1, 2, 3].map((j) => sample(f * per + j));
    const last = co[co.length - 1];
    steps.push({
      type: 'move',
      t: (f + 1) * 16.67,
      ...last,
      pointerType: 'pen',
      coalesced: co,
      predicted: [sample(f * per + 4)],
    });
  }
  steps.push({ type: 'up', t: (frames + 1) * 16.67 });
  return { name: 'pen-60fps-coalesced', steps };
}

function pen200Ramp(): Gesture {
  const n = 60;
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 50, y: 50, pressure: 0.05, pointerType: 'pen' },
  ];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    steps.push({
      type: 'move',
      t: i * 5,
      x: 50 + i * 3,
      y: 50 + 12 * Math.sin(i / 6),
      pressure: t > 0.95 ? 0 : 0.1 + 0.7 * t,
      pointerType: 'pen',
    });
  }
  steps.push({ type: 'up', t: n * 5 + 5 });
  return { name: 'pen-200hz-ramp', steps };
}

function touchPinch(): Gesture {
  return {
    name: 'touch-pinch',
    steps: [
      { type: 'down', t: 0, x: 80, y: 80, pressure: 0, pointerType: 'touch' },
      { type: 'move', t: 16, x: 90, y: 82, pressure: 0, pointerType: 'touch' },
      { type: 'move', t: 32, x: 100, y: 86, pressure: 0, pointerType: 'touch' },
      { type: 'pinch', on: true },
      { type: 'move', t: 48, x: 110, y: 90, pressure: 0, pointerType: 'touch' },
      { type: 'up', t: 64 },
      { type: 'pinch', on: false },
    ],
  };
}

function tap(): Gesture {
  return {
    name: 'mouse-tap',
    steps: [
      { type: 'down', t: 0, x: 40, y: 40, pressure: 0, pointerType: 'mouse' },
      { type: 'up', t: 60 },
    ],
  };
}

export const GESTURES: Gesture[] = [
  mouseCurve(),
  pen60Coalesced(),
  pen200Ramp(),
  touchPinch(),
  tap(),
];
