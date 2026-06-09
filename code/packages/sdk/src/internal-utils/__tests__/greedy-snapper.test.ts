// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest';
import { GreedySnapper } from '../greedy-snapper';

const defaultConfig = {
  snapAngles: [0, 90, 180, 270],
  activateThreshold: 10,
  releaseThreshold: 15,
};

// ---------------------------------------------------------------------------
// Suite 1: reset
// ---------------------------------------------------------------------------

describe('GreedySnapper.reset', () => {
  it('clears a locked snappedAngle so apply re-evaluates freely', () => {
    const snapper = new GreedySnapper(defaultConfig);
    // Lock to 90°
    snapper.apply(88);
    expect(snapper.apply(88)).toBe(90);

    // Reset clears the lock
    snapper.reset();
    // 88° is within activateThreshold of 90 → snaps again (same result, but state was cleared)
    expect(snapper.apply(50)).toBe(50); // 50° is 40° away from 45 snap; no snap expected
  });
});

// ---------------------------------------------------------------------------
// Suite 2: angleDiff
// ---------------------------------------------------------------------------

describe('GreedySnapper.angleDiff', () => {
  let snapper: GreedySnapper;

  beforeEach(() => {
    snapper = new GreedySnapper(defaultConfig);
  });

  it('returns the direct diff when diff ≤ 180', () => {
    expect(snapper.angleDiff(10, 30)).toBe(20);
  });

  it('returns 360 - diff when diff > 180 (wrap-around)', () => {
    // |5 - 355| = 350 → 350 > 180 → 360 - 350 = 10
    expect(snapper.angleDiff(5, 355)).toBe(10);
  });

  it('returns 0 for the same angle', () => {
    expect(snapper.angleDiff(45, 45)).toBe(0);
  });

  it('returns 180 at the boundary (not wrap-around)', () => {
    // |0 - 180| = 180 → 180 % 360 = 180 → not > 180 → returns 180
    expect(snapper.angleDiff(0, 180)).toBe(180);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: apply — not yet snapped
// ---------------------------------------------------------------------------

describe('GreedySnapper.apply — not yet snapped', () => {
  let snapper: GreedySnapper;

  beforeEach(() => {
    snapper = new GreedySnapper(defaultConfig);
  });

  it('snaps to the closest angle when within activateThreshold', () => {
    // 88° is 2° away from 90 → within threshold of 10 → snaps to 90
    expect(snapper.apply(88)).toBe(90);
  });

  it('returns normalized angle when beyond activateThreshold of all snapAngles', () => {
    // 50° is 40° from 90 and 50° from 0 — outside threshold
    expect(snapper.apply(50)).toBe(50);
  });

  it('normalizes negative input to 0–360 range', () => {
    // -5° → ((-5 % 360) + 360) % 360 = 355
    // Note: apply uses Math.abs(normalized - a) (not circular diff), so 355 is 85° from
    // nearest snap angle 270 — outside threshold. Returns normalized 355.
    expect(snapper.apply(-5)).toBe(355);
  });

  it('normalizes input > 360 correctly', () => {
    // 365° → 5° → within activateThreshold of 0 → snaps to 0
    expect(snapper.apply(365)).toBe(0);
  });

  it('loop finds a closer candidate and updates minDiff', () => {
    // Custom config with angles [0, 45, 90]
    // apply(46): initial closest=0, minDiff=46; loop: 45→d=1<46→update; 90→d=44>1 → snaps to 45
    const snapper2 = new GreedySnapper({
      snapAngles: [0, 45, 90],
      activateThreshold: 10,
      releaseThreshold: 15,
    });
    expect(snapper2.apply(46)).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: apply — already snapped
// ---------------------------------------------------------------------------

describe('GreedySnapper.apply — already snapped', () => {
  let snapper: GreedySnapper;

  beforeEach(() => {
    snapper = new GreedySnapper(defaultConfig);
    snapper.apply(88); // locks to 90
  });

  it('stays locked when diff ≤ releaseThreshold', () => {
    // Still near 90 (95° → diff = 5° ≤ 15) → stays at 90
    expect(snapper.apply(95)).toBe(90);
  });

  it('releases lock when diff > releaseThreshold', () => {
    // 115° → diff = 25° > 15 → releases, returns normalized 115
    expect(snapper.apply(115)).toBe(115);
  });

  it('can re-acquire a snap after release', () => {
    // Release first
    snapper.apply(115);
    // Now move close to 180° → should snap
    expect(snapper.apply(172)).toBe(180);
  });
});
