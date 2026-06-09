// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Stage } from 'konva/lib/Stage';
import type { WeaveNodesSelectionPanningOnSelectionConfig } from './types';

export type EdgePanningCallbacks = {
  getStage: () => Stage;
  isSelecting: () => boolean;
  /** Called on each animation frame where panning actually moves the stage. */
  onTick: (dx: number, dy: number) => void;
};

/**
 * Handles the rAF-driven auto-pan loop that scrolls the canvas when the
 * pointer is held near an edge during area selection.
 */
export class EdgePanning {
  private readonly config: WeaveNodesSelectionPanningOnSelectionConfig;
  private readonly callbacks: EdgePanningCallbacks;
  private panLoopId: number | null = null;
  readonly direction = { x: 0, y: 0 };
  private speed = { x: 0, y: 0 };

  constructor(
    config: WeaveNodesSelectionPanningOnSelectionConfig,
    callbacks: EdgePanningCallbacks
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /** Start the panning rAF loop. */
  start(): void {
    this.panLoopId = requestAnimationFrame(() => this.loop());
  }

  /** Stop the panning rAF loop. */
  stop(): void {
    if (this.panLoopId !== null) {
      cancelAnimationFrame(this.panLoopId);
      this.panLoopId = null;
    }
  }

  /** Reset direction and speed vectors to zero. */
  reset(): void {
    this.direction.x = 0;
    this.direction.y = 0;
    this.speed = { x: 0, y: 0 };
  }

  /**
   * Recalculate pan direction and speed based on current pointer position.
   * Should be called on every pointermove during area selection.
   */
  updateDirection(): void {
    const stage = this.callbacks.getStage();
    const pos = stage.getPointerPosition();
    const viewWidth = stage.width();
    const viewHeight = stage.height();

    if (!pos) return;

    const distLeft = pos.x;
    const distRight = viewWidth - pos.x;
    const distTop = pos.y;
    const distBottom = viewHeight - pos.y;

    this.direction.x = 0;
    this.direction.y = 0;
    this.speed = { x: 0, y: 0 };

    if (distLeft < this.config.edgeThreshold) {
      this.direction.x = 1;
      this.speed.x = this.getSpeedFromEdge(distLeft);
    } else if (distRight < this.config.edgeThreshold) {
      this.direction.x = -1;
      this.speed.x = this.getSpeedFromEdge(distRight);
    }

    if (distTop < this.config.edgeThreshold) {
      this.direction.y = 1;
      this.speed.y = this.getSpeedFromEdge(distTop);
    } else if (distBottom < this.config.edgeThreshold) {
      this.direction.y = -1;
      this.speed.y = this.getSpeedFromEdge(distBottom);
    }
  }

  private getSpeedFromEdge(distanceFromEdge: number): number {
    const stage = this.callbacks.getStage();
    const scaledDistance = distanceFromEdge / stage.scaleX();

    if (scaledDistance < this.config.edgeThreshold) {
      const factor = 1 - scaledDistance / this.config.edgeThreshold;
      return (
        this.config.minScrollSpeed +
        (this.config.maxScrollSpeed - this.config.minScrollSpeed) * factor
      );
    }

    return 0;
  }

  private loop(): void {
    const stage = this.callbacks.getStage();

    if (
      this.callbacks.isSelecting() &&
      (this.direction.x !== 0 || this.direction.y !== 0)
    ) {
      const scale = stage.scaleX();
      const stepX = (this.speed.x || 0) / scale;
      const stepY = (this.speed.y || 0) / scale;

      stage.x(stage.x() + this.direction.x * stepX);
      stage.y(stage.y() + this.direction.y * stepY);

      this.callbacks.onTick(this.direction.x * stepX, this.direction.y * stepY);
    }

    if (this.callbacks.isSelecting()) {
      this.panLoopId = requestAnimationFrame(() => this.loop());
    }
  }
}
