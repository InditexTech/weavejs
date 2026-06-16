// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeavePolygonPoint, WeavePolygonInnerRect } from './types';

type NormalizedPoint = { x: number; y: number };

type NormalizedInnerRect = {
  tl: NormalizedPoint;
  tr: NormalizedPoint;
  bl: NormalizedPoint;
  br: NormalizedPoint;
};

export type WeavePolygonPresetDef = {
  label: string;
  sides: number;
  defaultWidth: number;
  defaultHeight: number;
  /** Vertices in [0,0,1,1] circumscribed unit space. */
  normalizedPoints: NormalizedPoint[];
  /** Largest inscribed axis-aligned rect in [0,0,1,1] space. */
  normalizedInnerRect: NormalizedInnerRect;
};

export const WEAVE_POLYGON_PRESETS: Record<string, WeavePolygonPresetDef> = {
  triangle: {
    label: 'Triangle',
    sides: 3,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 0.933013, y: 0.75 },
      { x: 0.066987, y: 0.75 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.283494, y: 0.375 },
      tr: { x: 0.716506, y: 0.375 },
      bl: { x: 0.283494, y: 0.75 },
      br: { x: 0.716506, y: 0.75 },
    },
  },
  diamond: {
    label: 'Diamond',
    sides: 4,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.25, y: 0.25 },
      tr: { x: 0.75, y: 0.25 },
      bl: { x: 0.25, y: 0.75 },
      br: { x: 0.75, y: 0.75 },
    },
  },
  pentagon: {
    label: 'Pentagon',
    sides: 5,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 0.975528, y: 0.345492 },
      { x: 0.793893, y: 0.904508 },
      { x: 0.206107, y: 0.904508 },
      { x: 0.024472, y: 0.345492 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.132634, y: 0.316578 },
      tr: { x: 0.867366, y: 0.316578 },
      bl: { x: 0.132634, y: 0.678381 },
      br: { x: 0.867366, y: 0.678381 },
    },
  },
  hexagon: {
    label: 'Hexagon',
    sides: 6,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 0.933013, y: 0.25 },
      { x: 0.933013, y: 0.75 },
      { x: 0.5, y: 1 },
      { x: 0.066987, y: 0.75 },
      { x: 0.066987, y: 0.25 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.066987, y: 0.25 },
      tr: { x: 0.933013, y: 0.25 },
      bl: { x: 0.066987, y: 0.75 },
      br: { x: 0.933013, y: 0.75 },
    },
  },
  octagon: {
    label: 'Octagon',
    sides: 8,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 0.853553, y: 0.146447 },
      { x: 1, y: 0.5 },
      { x: 0.853553, y: 0.853553 },
      { x: 0.5, y: 1 },
      { x: 0.146447, y: 0.853553 },
      { x: 0, y: 0.5 },
      { x: 0.146447, y: 0.146447 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.25, y: 0.25 },
      tr: { x: 0.75, y: 0.25 },
      bl: { x: 0.25, y: 0.75 },
      br: { x: 0.75, y: 0.75 },
    },
  },
  decagon: {
    label: 'Decagon',
    sides: 10,
    defaultWidth: 100,
    defaultHeight: 100,
    normalizedPoints: [
      { x: 0.5, y: 0 },
      { x: 0.793893, y: 0.095492 },
      { x: 0.975528, y: 0.345492 },
      { x: 0.975528, y: 0.654508 },
      { x: 0.793893, y: 0.904508 },
      { x: 0.5, y: 1 },
      { x: 0.206107, y: 0.904508 },
      { x: 0.024472, y: 0.654508 },
      { x: 0.024472, y: 0.345492 },
      { x: 0.206107, y: 0.095492 },
    ],
    normalizedInnerRect: {
      tl: { x: 0.093851, y: 0.35 },
      tr: { x: 0.906149, y: 0.35 },
      bl: { x: 0.093851, y: 0.75 },
      br: { x: 0.906149, y: 0.75 },
    },
  },
} as const satisfies Record<string, WeavePolygonPresetDef>;

export type WeavePolygonPreset = keyof typeof WEAVE_POLYGON_PRESETS;

/**
 * Scales a preset's normalized points and inner rect to actual pixel dimensions.
 *
 * Points are normalized so that minX = 0 and minY = 0 in the resulting pixel
 * space. This ensures the polygon group's position corresponds exactly to the
 * visual top-left of the polygon, which is required for the snapping system to
 * work correctly (it assumes nodeBox.x === node.x()).
 */
export function instantiatePreset(
  def: WeavePolygonPresetDef,
  width: number,
  height: number
): {
  points: WeavePolygonPoint[];
  innerRect: WeavePolygonInnerRect;
  width: number;
  height: number;
} {
  const rawPoints = def.normalizedPoints.map((p) => ({
    x: p.x * width,
    y: p.y * height,
  }));

  const minX = Math.min(...rawPoints.map((p) => p.x));
  const minY = Math.min(...rawPoints.map((p) => p.y));

  const points: WeavePolygonPoint[] = rawPoints.map((p) => ({
    x: p.x - minX,
    y: p.y - minY,
  }));

  const ir = def.normalizedInnerRect;
  const innerRect: WeavePolygonInnerRect = {
    tl: { x: ir.tl.x * width - minX, y: ir.tl.y * height - minY },
    tr: { x: ir.tr.x * width - minX, y: ir.tr.y * height - minY },
    bl: { x: ir.bl.x * width - minX, y: ir.bl.y * height - minY },
    br: { x: ir.br.x * width - minX, y: ir.br.y * height - minY },
  };

  const visualWidth = Math.max(...points.map((p) => p.x));
  const visualHeight = Math.max(...points.map((p) => p.y));

  return { points, innerRect, width: visualWidth, height: visualHeight };
}
