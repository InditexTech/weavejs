// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export interface GreedySnapConfig {
  snapAngles: number[];
  activateThreshold: number; // degrees
  releaseThreshold: number; // degrees
}

export class GreedySnapper {
  private snappedAngle: number | null = null;
  private readonly config: GreedySnapConfig;

  constructor(config: GreedySnapConfig) {
    this.config = config;
  }

  reset() {
    this.snappedAngle = null;
  }

  apply(angleDeg: number): number {
    const { snapAngles, activateThreshold, releaseThreshold } = this.config;

    // Normalize to 0–360
    const normalized = ((angleDeg % 360) + 360) % 360;

    // ---- Already snapped: check release threshold ----
    if (this.snappedAngle !== null) {
      const diff = Math.abs(normalized - this.snappedAngle);
      if (diff > releaseThreshold) {
        this.snappedAngle = null; // release lock
        return normalized;
      }
      return this.snappedAngle; // stay locked
    }

    // ---- Not snapped yet: find closest angle ----
    let closest = snapAngles[0];
    let minDiff = Math.abs(normalized - closest);

    for (const a of snapAngles) {
      const d = Math.abs(normalized - a);
      if (d < minDiff) {
        minDiff = d;
        closest = a;
      }
    }

    // Activate snap
    if (minDiff <= activateThreshold) {
      this.snappedAngle = closest;
      return closest;
    }

    return normalized;
  }
}
