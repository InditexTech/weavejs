// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { BRUSH_LEGACY_INPUT_PROFILE } from '@/actions/brush-tool/constants';
import { RecordingStore, replayRecording } from '../ghosts';
import type { LabRecording } from '../types';

// every event carries 3 coalesced samples, 1 unit apart
const recording = (events = 10, id = 0): LabRecording => ({
  profileKey: 'mouse',
  strokeWidth: 8,
  zoom: 1,
  gesture: {
    events: Array.from({ length: events }, (_, i) => ({
      time: i * 8,
      samples: [0, 1, 2].map((k) => ({
        x: i * 3 + k + id,
        y: Math.sin((i * 3 + k) / 6) * 10,
        pressure: 0.6,
      })),
    })),
  },
});

const coalesced = {
  ...BRUSH_LEGACY_INPUT_PROFILE,
  capture: {
    ...BRUSH_LEGACY_INPUT_PROFILE.capture,
    source: 'coalesced' as const,
  },
  finalize: { ...BRUSH_LEGACY_INPUT_PROFILE.finalize, mode: 'none' as const },
};
const legacyNoFinalize = {
  ...BRUSH_LEGACY_INPUT_PROFILE,
  finalize: { ...BRUSH_LEGACY_INPUT_PROFILE.finalize, mode: 'none' as const },
};

describe('RecordingStore', () => {
  it('keeps the last N and drops the oldest', () => {
    const store = new RecordingStore(3);
    for (let i = 0; i < 5; i++) store.add(recording(2, i));
    expect(store.size).toBe(3);
    expect(store.all().map((r) => r.gesture.events[0].samples[0].x)).toEqual([
      2, 3, 4,
    ]);
    expect(store.last()?.gesture.events[0].samples[0].x).toBe(4);
  });

  it('shrinks when the maximum is lowered and clears on request', () => {
    const store = new RecordingStore(5);
    for (let i = 0; i < 5; i++) store.add(recording(2, i));
    store.setMax(2);
    expect(store.size).toBe(2);
    store.clear();
    expect(store.size).toBe(0);
    expect(store.last()).toBeUndefined();
  });
});

describe('replayRecording', () => {
  it('a brush that captures coalesced samples keeps every sample', () => {
    expect(replayRecording(recording(), coalesced, 0)).toHaveLength(30);
  });

  it('the legacy capture keeps one sample per event', () => {
    const points = replayRecording(recording(), legacyNoFinalize, 0);
    expect(points).toHaveLength(10);
    expect(points[0].x).toBe(2);
  });

  it('skips samples closer than the minimum move', () => {
    const p = {
      ...coalesced,
      capture: { ...coalesced.capture, minMovePx: 2.5 },
    };
    expect(replayRecording(recording(), p, 0).length).toBeLessThan(30);
  });

  it('a stabilizer makes the replay lag behind the raw line', () => {
    const rec = recording();
    const stabilized = {
      ...coalesced,
      stabilizer: {
        ...coalesced.stabilizer,
        type: 'streamline' as const,
        amount: 0.8,
      },
    };
    const points = replayRecording(rec, stabilized, 0);
    expect(points[15].x).toBeLessThan(rec.gesture.events[5].samples[0].x);
  });

  it('simplifies at the end when the brush finishes with a tolerance', () => {
    const rec = recording(40);
    const plain = replayRecording(rec, coalesced, 0);
    const finished = replayRecording(
      rec,
      {
        ...coalesced,
        finalize: { ...coalesced.finalize, mode: 'dp' as const },
      },
      2
    );
    expect(finished.length).toBeLessThan(plain.length);
  });

  it('returns nothing for an empty gesture', () => {
    const rec = recording();
    rec.gesture = { events: [] };
    expect(replayRecording(rec, coalesced, 1)).toEqual([]);
  });

  it('completes a stabilized stroke where the pen was lifted, as the brush does', () => {
    const rec = recording();
    const lastRaw = rec.gesture.events[9].samples[2];
    const stabilized = {
      ...coalesced,
      stabilizer: {
        ...coalesced.stabilizer,
        type: 'streamline' as const,
        amount: 0.8,
        catchUpOnEnd: true,
      },
    };
    const caught = replayRecording(rec, stabilized, 0);
    expect(caught[caught.length - 1]).toMatchObject({
      x: lastRaw.x,
      y: lastRaw.y,
    });
    const notCaught = replayRecording(
      rec,
      {
        ...stabilized,
        stabilizer: { ...stabilized.stabilizer, catchUpOnEnd: false },
      },
      0
    );
    expect(notCaught[notCaught.length - 1].x).toBeLessThan(lastRaw.x);
  });

  it('gives each coalesced sample its own time', () => {
    const rec = recording(4);
    // samples of one event share its time unless they carry their own
    rec.gesture.events.forEach((e) =>
      e.samples.forEach((s, k) => (s.time = e.time + k * 2))
    );
    const withTimes = replayRecording(
      rec,
      {
        ...coalesced,
        stabilizer: {
          ...coalesced.stabilizer,
          type: 'oneEuro' as const,
          minCutoff: 1,
          beta: 0,
        },
      },
      0
    );
    rec.gesture.events.forEach((e) => e.samples.forEach((s) => delete s.time));
    const without = replayRecording(
      rec,
      {
        ...coalesced,
        stabilizer: {
          ...coalesced.stabilizer,
          type: 'oneEuro' as const,
          minCutoff: 1,
          beta: 0,
        },
      },
      0
    );
    expect(withTimes).not.toEqual(without);
  });
});
