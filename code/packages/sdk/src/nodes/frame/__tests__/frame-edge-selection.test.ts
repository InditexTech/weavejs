// @vitest-environment jsdom
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Konva from 'konva';
import { WeaveFrameNode } from '../frame';
import type { GroupFrame } from '../group-frame';
import {
  WEAVE_FRAME_NODE_DEFAULT_CONFIG,
  WEAVE_FRAME_NODE_TYPE,
} from '../constants';
import {
  buildFrameHitFunc,
  getFrameEdgeBand,
  getFrameTitleHeight,
} from '../hit-region';
import type { WeaveFrameAttributes, WeaveFrameProperties } from '../types';
import { augmentKonvaNodeClass } from '../../node';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

type Rect = { x: number; y: number; width: number; height: number };

const W = 400;
const H = 300;

function collectRects(hitFunc: (ctx: never, shape: never) => void): Rect[] {
  const rects: Rect[] = [];
  const ctx = {
    beginPath: vi.fn(),
    rect: (x: number, y: number, width: number, height: number) =>
      rects.push({ x, y, width, height }),
    fillStrokeShape: vi.fn(),
  };
  hitFunc(ctx as never, {} as never);
  return rects;
}

function isHit(rects: Rect[], px: number, py: number) {
  return rects.some(
    (r) =>
      px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height
  );
}

function props(
  overrides: Partial<WeaveFrameAttributes> = {}
): WeaveFrameAttributes {
  return {
    id: 'frame-id',
    nodeType: WEAVE_FRAME_NODE_TYPE,
    x: 0,
    y: 0,
    title: 'Test Frame',
    frameWidth: W,
    frameHeight: H,
    frameBackground: '#FFFFFFFF',
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
    children: [],
    ...overrides,
  } as WeaveFrameAttributes;
}

beforeAll(() => {
  augmentKonvaNodeClass();
});

describe('hit-region helpers', () => {
  it('E.1 band is edgeHitWidth / zoom at zoom 1 (6 -> outer 4, inner 2)', () => {
    expect(getFrameEdgeBand(1, 6, 1)).toEqual({ outer: 4, inner: 2 });
  });

  it('E.2 band scales up when zoomed out (zoom 0.1 -> 60 units)', () => {
    const { outer, inner } = getFrameEdgeBand(1, 6, 0.1);
    expect(outer + inner).toBeCloseTo(60);
    expect(outer).toBeCloseTo(40);
  });

  it('E.3 band never goes below borderWidth (zoom 5, borderWidth 10)', () => {
    const { outer, inner } = getFrameEdgeBand(10, 6, 5);
    expect(outer).toBe(10);
    expect(inner).toBe(0);
  });

  it('E.4 title height is scale aware', () => {
    expect(getFrameTitleHeight(20, 20, 1)).toBe(60);
    expect(getFrameTitleHeight(20, 20, 2)).toBe(40);
  });

  describe('hit function geometry', () => {
    const build = (zoom: number) =>
      collectRects(
        buildFrameHitFunc({
          frameWidth: W,
          frameHeight: H,
          borderWidth: 1,
          edgeHitWidth: 6,
          zoom,
          titleHeight: 60,
        }) as never
      );

    it('E.5 hits all four edges at zoom 1', () => {
      const rects = build(1);
      expect(isHit(rects, W / 2, 0)).toBe(true);
      expect(isHit(rects, W / 2, H)).toBe(true);
      expect(isHit(rects, 0, H / 2)).toBe(true);
      expect(isHit(rects, W, H / 2)).toBe(true);
    });

    it('E.6 hits a point just outside the border and just inside', () => {
      const rects = build(1);
      expect(isHit(rects, -3, H / 2)).toBe(true);
      expect(isHit(rects, 1.5, H / 2)).toBe(true);
    });

    it('E.7 does not hit the empty interior', () => {
      const rects = build(1);
      expect(isHit(rects, W / 2, H / 2)).toBe(false);
      expect(isHit(rects, 20, 20)).toBe(false);
    });

    it('E.8 does not hit far outside the band', () => {
      const rects = build(1);
      expect(isHit(rects, -20, H / 2)).toBe(false);
      expect(isHit(rects, W / 2, H + 20)).toBe(false);
    });

    it('E.9 title strip is still hit', () => {
      const rects = build(1);
      expect(isHit(rects, W / 2, -30)).toBe(true);
    });

    it('E.10 at zoom 0.1 a point 3 screen px outside the border is hit', () => {
      const rects = build(0.1);
      expect(isHit(rects, -3 / 0.1, H / 2)).toBe(true);
    });

    it('E.11 at zoom 0.1 the interior beyond the band is still not hit', () => {
      const rects = build(0.1);
      expect(isHit(rects, W / 2, H / 2)).toBe(false);
    });
  });
});

describe('WeaveFrameNode edge selection', () => {
  let node: WeaveFrameNode;
  let mock: ReturnType<typeof createMockInstance>;
  let scale: number;

  function make(config?: Partial<WeaveFrameProperties>) {
    node = config ? new WeaveFrameNode({ config }) : new WeaveFrameNode();
    mock = createMockInstance();
    scale = 1;
    mock.getStage().scaleX.mockImplementation(() => scale);
    (mock.getStage() as unknown as { mode: () => string }).mode = () => 'default';
    mock.getStore = vi.fn().mockReturnValue({ getUser: () => ({ id: 'u' }) });
    mock.getInstanceRecursive = vi.fn().mockImplementation((n: unknown) => n);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance = mock;
  }

  function render(): GroupFrame {
    return node.onRender(props()) as GroupFrame;
  }

  function rectsOf(frame: GroupFrame) {
    const area = frame.findOne('#frame-id-selection-area') as Konva.Rect;
    return collectRects(area.hitFunc() as never);
  }

  function selectFrame(frame: GroupFrame, selected: boolean) {
    mock.getPlugin.mockReturnValue({
      getSelectedNodes: vi.fn().mockReturnValue(selected ? [frame] : []),
      isEnabled: vi.fn().mockReturnValue(true),
      getActiveGroupContext: vi.fn().mockReturnValue(undefined),
      isPasting: vi.fn().mockReturnValue(false),
      isDragging: vi.fn().mockReturnValue(false),
      isTransforming: vi.fn().mockReturnValue(false),
      getTransformer: vi.fn().mockReturnValue({ nodes: vi.fn().mockReturnValue([]) }),
      getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    });
    const listener = mock.addEventListener.mock.calls
      .filter(([ev]) => ev === 'onNodesChange')
      .map(([, cb]) => cb)
      .at(-1);
    listener?.();
  }

  beforeEach(() => {
    make();
  });

  it('F.1 default config exposes edgeHitWidth', () => {
    expect(WEAVE_FRAME_NODE_DEFAULT_CONFIG.edgeHitWidth).toBe(6);
  });

  it('F.2 selection area hits edges and title but not the interior', () => {
    const rects = rectsOf(render());
    expect(isHit(rects, W / 2, 0)).toBe(true);
    expect(isHit(rects, W / 2, -30)).toBe(true);
    expect(isHit(rects, W / 2, H / 2)).toBe(false);
  });

  it('F.3 onZoomChange recomputes the band at the new zoom', () => {
    const frame = render();
    expect(isHit(rectsOf(frame), -20, H / 2)).toBe(false);

    scale = 0.1;
    const zoom = mock.addEventListener.mock.calls.find(
      ([ev]) => ev === 'onZoomChange'
    )?.[1];
    zoom?.();

    expect(isHit(rectsOf(frame), -20, H / 2)).toBe(true);
  });

  it('F.4 frame clip does not cut the outward band', () => {
    scale = 0.1;
    const frame = render();
    const clip = frame.clip();
    const { outer } = getFrameEdgeBand(1, 6, 0.1);
    expect(clip.x).toBeLessThanOrEqual(-outer);
    expect(clip.y).toBeLessThanOrEqual(-outer);
    expect(clip.x + clip.width).toBeGreaterThanOrEqual(W + outer);
    expect(clip.y + clip.height).toBeGreaterThanOrEqual(H + outer);
  });

  it('F.5 onUpdate keeps title strip and band consistent and scale aware', () => {
    const frame = render();
    const title = frame.findOne('#frame-id-title') as Konva.Text;
    const before = title.height();

    mock.getStage().findOne.mockImplementation((s: string) => frame.findOne(s));
    node.onUpdate(frame, props());

    expect(title.height()).toBeCloseTo(before);
    expect(isHit(rectsOf(frame), W / 2, 0)).toBe(true);
    expect(isHit(rectsOf(frame), W / 2, H / 2)).toBe(false);
  });

  it('F.5b onUpdate at low zoom does not move the title', () => {
    const frame = render();
    const title = frame.findOne('#frame-id-title') as Konva.Text;
    const yAtRender = title.y();

    mock.getStage().findOne.mockImplementation((s: string) => frame.findOne(s));
    scale = 0.25;
    node.onUpdate(frame, props({ x: 500, y: 500 }));

    expect(title.y()).toBe(yAtRender);
  });

  it('F.6 two adjacent frames: bands overlap at very low zoom without throwing', () => {
    scale = 0.05;
    const a = node.onRender(props({ id: 'a' })) as GroupFrame;
    const b = node.onRender(props({ id: 'b', x: W + 10 })) as GroupFrame;
    const stage = new Konva.Stage({ container: document.createElement('div'), width: 10, height: 10 });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(a);
    layer.add(b);
    b.moveToTop();
    expect(b.zIndex()).toBeGreaterThan(a.zIndex());
  });

  describe('cursor', () => {
    function fireOnFrame(frame: GroupFrame, eventName: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listeners = (frame as any).eventListeners[eventName] ?? [];
      listeners.at(-1).handler.call(frame, { target: frame, evt: {} });
    }

    it('F.7 selected frame is not "move" on hover or after a click', () => {
      const frame = render();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      selectFrame(frame, true);
      expect(frame.defineMousePointer()).toBe('grab');
      selectFrame(frame, false);
      expect(frame.defineMousePointer()).toBe('pointer');
    });

    it('F.8 move cursor only while dragging, restored on drag end', () => {
      const frame = render();
      const container = mock.getStage().container();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      selectFrame(frame, true);

      fireOnFrame(frame, 'dragstart');
      expect(container.style.cursor).toBe('move');

      container.style.cursor = 'default';
      fireOnFrame(frame, 'dragmove');
      expect(container.style.cursor).toBe('move');

      fireOnFrame(frame, 'dragend');
      expect(container.style.cursor).toBe('grab');
    });

    it('F.8b dragmove outside a drag does not set the move cursor', () => {
      const frame = render();
      const container = mock.getStage().container();
      container.style.cursor = 'default';
      fireOnFrame(frame, 'dragmove');
      expect(container.style.cursor).toBe('default');
    });
  });
});
