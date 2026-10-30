// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { BRUSH_LEGACY_INPUT_PROFILE } from '@/actions/brush-tool/constants';
import { WeaveBrushLabPlugin } from '../brush-lab';
import { BRUSH_LAB_METRICS_EVENT } from '../constants';

function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const stage = new Konva.Stage({
    container: host,
    width: 400,
    height: 300,
  });
  const emitted: [string, unknown][] = [];
  const docLayer = new Konva.Layer({ id: 'main' });
  stage.add(docLayer);
  const instance = {
    getStage: () => stage,
    getChildLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    emitEvent: vi.fn((name: string, payload: unknown) =>
      emitted.push([name, payload])
    ),
    addNode: vi.fn(),
    getStore: vi.fn(),
  };
  const lab = new WeaveBrushLabPlugin({ maxGhosts: 3 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lab.register(instance as any);
  lab.onInit();
  return { lab, stage, instance, emitted, docLayer };
}

const pointer = (
  ctx: ReturnType<typeof setup>,
  type: string,
  x: number,
  coalesced = 0
) => {
  const e = new Event(type) as Event & Record<string, unknown>;
  Object.defineProperty(e, 'timeStamp', { value: x });
  Object.assign(e, {
    pointerId: 1,
    pointerType: 'pen',
    pressure: 0.5,
    clientX: x,
    clientY: 10,
    getCoalescedEvents: () =>
      Array.from({ length: coalesced }, (_, i) => ({
        clientX: x + i,
        clientY: 10,
        pressure: 0.5,
      })),
  });
  ctx.stage.container().dispatchEvent(e);
};

const start = (lab: WeaveBrushLabPlugin) =>
  lab.onStrokeStart({
    profile: 'pen.desktop',
    preset: 'fixed',
    profileConfig: BRUSH_LEGACY_INPUT_PROFILE,
    strokeWidth: 8,
    zoom: 1,
  });

const gesture = (lab: WeaveBrushLabPlugin, n: number, predicted = 0) => {
  start(lab);
  for (let i = 0; i < n; i++) {
    lab.onSample({
      raw: { x: i * 4, y: 10 + (i % 2) },
      stabilized: { x: i * 4 - 1, y: 10 },
      pressure: 0.6,
      time: i * 8,
      predicted: false,
    });
  }
  for (let i = 0; i < predicted; i++) {
    lab.onSample({
      raw: { x: 500, y: 0 },
      stabilized: { x: 500, y: 0 },
      pressure: 0.6,
      time: 1000,
      predicted: true,
    });
  }
  lab.onBatch({ ms: 2, samples: n });
  lab.onStrokeEnd({
    beforeFinalize: Array.from({ length: n }, (_, i) => ({
      x: i * 4,
      y: 10,
      pressure: 0.6,
    })),
    finalPoints: [
      { x: 0, y: 10, pressure: 0.6 },
      { x: (n - 1) * 4, y: 10, pressure: 0.6 },
    ],
    strokeWidth: 8,
    finalizeMs: 1,
  });
};

const count = (lab: WeaveBrushLabPlugin, name: string) =>
  lab.getLayer()!.find(`.${name}`).length;

describe('WeaveBrushLabPlugin', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has the name the brush tool looks for and its own layer', () => {
    expect(ctx.lab.getName()).toBe('brushLab');
    expect(ctx.lab.getLayer()).toBeDefined();
    expect(ctx.lab.isEnabled()).toBe(true);
  });

  it('emits metrics when a stroke ends', () => {
    gesture(ctx.lab, 10);
    expect(ctx.emitted).toHaveLength(1);
    expect(ctx.emitted[0][0]).toBe(BRUSH_LAB_METRICS_EVENT);
    expect(ctx.lab.getLastMetrics()).toMatchObject({
      profile: 'pen.desktop',
      preset: 'fixed',
      samples: 10,
      points: 2,
    });
    expect(ctx.lab.getLastMetrics()!.drawMs).toBe(3);
  });

  it('draws one marker per reported sample and none for predicted ones', () => {
    ctx.lab.setOverlay('raw', true);
    ctx.lab.setOverlay('stabilized', true);
    gesture(ctx.lab, 12, 3);
    expect(count(ctx.lab, 'lab-raw')).toBe(12);
    expect(count(ctx.lab, 'lab-stabilized')).toBe(12);
    expect(count(ctx.lab, 'lab-final')).toBe(0);
  });

  it('draws final points and the pressure graph when asked', () => {
    gesture(ctx.lab, 8);
    expect(ctx.lab.getLayer()!.getChildren()).toHaveLength(0);
    ctx.lab.setOverlay('final', true);
    ctx.lab.setOverlay('pressure', true);
    expect(count(ctx.lab, 'lab-final')).toBe(2);
    expect(count(ctx.lab, 'lab-pressure')).toBe(1);
    ctx.lab.setOverlay('final', false);
    expect(count(ctx.lab, 'lab-final')).toBe(0);
  });

  it('shows markers live while a stroke is being drawn', () => {
    ctx.lab.setOverlay('raw', true);
    start(ctx.lab);
    for (let i = 0; i < 4; i++) {
      ctx.lab.onSample({
        raw: { x: i, y: 0 },
        stabilized: { x: i, y: 0 },
        pressure: 0.5,
        time: i,
        predicted: false,
      });
    }
    expect(count(ctx.lab, 'lab-raw')).toBe(4);
  });

  it('never adds a node to the document', () => {
    ctx.lab.setOverlay('raw', true);
    ctx.lab.setOverlay('final', true);
    gesture(ctx.lab, 10);
    ctx.lab.compareLast('A');
    expect(ctx.docLayer.getChildren()).toHaveLength(0);
    expect(ctx.instance.addNode).not.toHaveBeenCalled();
    expect(ctx.stage.find('.node')).toHaveLength(0);
  });

  it('keeps only the last N strokes', () => {
    for (let i = 0; i < 5; i++) gesture(ctx.lab, 6);
    expect(ctx.lab.getRecordingCount()).toBe(3);
  });

  it('draws what was drawn and the chosen brush, labelled, and clears them', () => {
    pointer(ctx, 'pointerdown', 0);
    for (let i = 1; i < 20; i++) pointer(ctx, 'pointermove', i * 3);
    pointer(ctx, 'pointerup', 60);
    gesture(ctx.lab, 12);
    expect(ctx.lab.compareLast('F')).toMatchObject({ lines: 1 });
    expect(count(ctx.lab, 'lab-actual')).toBe(1);
    expect(count(ctx.lab, 'lab-ghost')).toBe(1);
    expect(count(ctx.lab, 'lab-ghost-label')).toBe(1);
    ctx.lab.clearGhosts();
    expect(count(ctx.lab, 'lab-ghost')).toBe(0);
    expect(count(ctx.lab, 'lab-actual')).toBe(0);
    expect(ctx.lab.getRecordingCount()).toBe(0);
  });

  it('shows one brush at a time: choosing another replaces the first', () => {
    pointer(ctx, 'pointerdown', 0);
    for (let i = 1; i < 10; i++) pointer(ctx, 'pointermove', i * 3);
    gesture(ctx.lab, 8);
    ctx.lab.compareLast('A');
    ctx.lab.compareLast('F');
    expect(count(ctx.lab, 'lab-ghost')).toBe(1);
    expect(count(ctx.lab, 'lab-actual')).toBe(1);
  });

  it('refuses an unknown brush and says why', () => {
    gesture(ctx.lab, 8);
    expect(ctx.lab.compareLast('nope')).toMatchObject({ lines: 0 });
    expect(count(ctx.lab, 'lab-ghost')).toBe(0);
  });

  it('says so when no stroke was recorded', () => {
    expect(ctx.lab.compareLast('A').reason).toMatch(/draw one first/);
  });

  it('removes the comparison when the next stroke starts', () => {
    gesture(ctx.lab, 8);
    ctx.lab.compareLast('A');
    start(ctx.lab);
    expect(count(ctx.lab, 'lab-ghost')).toBe(0);
  });

  it('records the pointer gesture whatever the brush, coalesced samples included', () => {
    pointer(ctx, 'pointerdown', 0);
    pointer(ctx, 'pointermove', 5, 3);
    pointer(ctx, 'pointermove', 10, 3);
    gesture(ctx.lab, 4);
    const rec = (
      ctx.lab as unknown as {
        recordings: {
          last(): { gesture: { events: { samples: unknown[] }[] } };
        };
      }
    ).recordings.last();
    expect(rec.gesture.events.map((e) => e.samples.length)).toEqual([1, 3, 3]);
  });

  it('hides its layer when disabled and shows it again when enabled', () => {
    ctx.lab.disable();
    expect(ctx.lab.isEnabled()).toBe(false);
    expect(ctx.lab.getLayer()!.visible()).toBe(false);
    ctx.lab.enable();
    expect(ctx.lab.getLayer()!.visible()).toBe(true);
  });

  it('ignores samples that arrive outside a stroke', () => {
    ctx.lab.onSample({
      raw: { x: 1, y: 1 },
      stabilized: { x: 1, y: 1 },
      pressure: 1,
      time: 0,
      predicted: false,
    });
    ctx.lab.onStrokeEnd({
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 1,
      finalizeMs: 0,
    });
    expect(ctx.emitted).toHaveLength(0);
  });
});

describe('WeaveBrushLabPlugin keeps everything in memory', () => {
  it('makes no network request and writes nothing to browser storage or the document', () => {
    const fetchSpy = vi.fn();
    const setItem = vi.fn();
    const store = { setItem, getItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('localStorage', store);
    vi.stubGlobal('sessionStorage', store);
    vi.stubGlobal('indexedDB', { open: vi.fn() });
    const beacon = vi.fn();
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    class NoSocket {
      constructor() {
        throw new Error('no network');
      }
    }
    vi.stubGlobal('WebSocket', NoSocket);
    vi.stubGlobal('XMLHttpRequest', NoSocket);

    const { lab, instance } = setup();
    lab.setOverlay('raw', true);
    lab.setOverlay('pressure', true);
    for (let i = 0; i < 3; i++) gesture(lab, 15);
    lab.compareLast('A');
    lab.clearGhosts();
    lab.disable();
    lab.enable();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(instance.addNode).not.toHaveBeenCalled();
    expect(instance.getStore).not.toHaveBeenCalled();
    // the only thing it publishes is the metrics event
    expect(
      instance.emitEvent.mock.calls.every(
        ([name]) => name === BRUSH_LAB_METRICS_EVENT
      )
    ).toBe(true);

    vi.unstubAllGlobals();
  });
});
