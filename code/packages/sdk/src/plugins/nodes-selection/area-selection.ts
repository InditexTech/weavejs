// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Stage } from 'konva/lib/Stage';
import type { WeaveNodesSelectionConfig } from './types';

/**
 * Manages the visual selection-rectangle drawn while the user drags an area
 * selection, plus the coordinate state (x1/y1/x2/y2) that tracks its bounds.
 */
export class AreaSelector {
  private rect!: Konva.Rect;
  private x1 = 0;
  private y1 = 0;
  private x2 = 0;
  private y2 = 0;
  /** The stage-space anchor point when area selection started (updated by edge panning). */
  selectionStart: { x: number; y: number } | null = null;

  /**
   * Create and add the selection Konva.Rect to the given layer.
   * Must be called once during plugin initialisation.
   */
  init(layer: Konva.Layer, config: WeaveNodesSelectionConfig['selectionArea'], scaleX: number): void {
    this.rect = new Konva.Rect({
      ...config,
      ...((config.strokeWidth as number) && {
        strokeWidth: (config.strokeWidth as number) / scaleX,
      }),
      ...(config.dash && {
        dash: (config.dash as number[]).map((d) => d / scaleX),
      }),
      visible: false,
      listening: false,
    });
    layer.add(this.rect);
  }

  getRect(): Konva.Rect {
    return this.rect;
  }

  /** Returns the screen-space bounding box of the selection rectangle. */
  getBox() {
    return this.rect.getClientRect();
  }

  /** Set the anchor corner when area selection begins. */
  setStart(x: number, y: number): void {
    this.x1 = x;
    this.y1 = y;
    this.x2 = x;
    this.y2 = y;
    this.selectionStart = { x, y };
  }

  /**
   * Adjust stroke and dash to compensate for stage scale, reset dimensions.
   * Call when area selection starts so the rect looks pixel-perfect at any zoom.
   */
  resetForScale(
    scaleX: number,
    config: WeaveNodesSelectionConfig['selectionArea']
  ): void {
    this.rect.strokeWidth((config.strokeWidth as number) / scaleX);
    this.rect.dash((config.dash as number[])?.map((d) => d / scaleX) ?? []);
    this.rect.width(0);
    this.rect.height(0);
  }

  /**
   * Recalculate x2/y2 from the current pointer position and repaint the rect.
   * @param selectNone — Callback that clears the transformer selection; called
   *   before updating the rect so previously selected nodes are deselected.
   */
  update(stage: Stage, selectNone: () => void): void {
    this.x2 = stage.getRelativePointerPosition()?.x ?? 0;
    this.y2 = stage.getRelativePointerPosition()?.y ?? 0;
    selectNone();
    this.rect.setAttrs({
      visible: true,
      x: Math.min(this.x1, this.x2),
      y: Math.min(this.y1, this.y2),
      width: Math.abs(this.x2 - this.x1),
      height: Math.abs(this.y2 - this.y1),
    });
  }

  hide(): void {
    this.rect.setAttrs({ width: 0, height: 0, visible: false });
  }
}
