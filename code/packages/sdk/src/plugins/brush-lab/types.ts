// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushInputProfileKey } from '@/actions/brush-tool/types';

export type LabPoint = { x: number; y: number };
export type LabPressurePoint = LabPoint & {
  pressure: number;
  /** Time of this sample's own event, in ms, when it has one. */
  time?: number;
};

/** One sample the brush tool reported, as it was recorded. */
export type LabRecordedSample = {
  raw: LabPoint;
  stabilized: LabPoint;
  pressure: number;
  /** Time reported for the sample, in ms. */
  time: number;
  predicted: boolean;
};

/** Measurements of one finished stroke. */
export type WeaveBrushLabMetrics = {
  profile: WeaveBrushInputProfileKey;
  preset: string;
  scenario?: string;
  /** Samples the device reported (predicted ones left out). */
  samples: number;
  /** Points kept after finishing. */
  points: number;
  /** Consecutive samples at the same position. */
  droppedDuplicates: number;
  /** Samples per second over the stroke. */
  effectiveRateHz: number;
  /** Mean distance of a raw sample from the line through its neighbours. */
  jitter: number;
  /** Mean distance between each raw sample and where it was recorded. */
  lag: number;
  /** Largest distance a point moved by finishing the stroke. */
  movedOnFinish: number;
  /** Mean change of width between neighbouring points, in canvas units. */
  widthRoughness: number;
  /** Time spent processing and finishing the stroke, in ms. */
  drawMs: number;
};

/** What the lab knows about the pointer devices it has seen. */
export type WeaveBrushLabDeviceReport = {
  pointerType: string | null;
  resolvedProfile: WeaveBrushInputProfileKey | null;
  /** Pointer events per second. */
  sampleRateHz: number;
  /** Mean samples per event, coalesced ones included. */
  samplesPerEvent: number;
  pressure: { min: number; max: number } | null;
  tilt: boolean;
  predictedAvailable: boolean;
  zoom: number;
  fps: number;
  warnings: WeaveBrushLabWarning[];
};

export type WeaveBrushLabWarning = 'penReportsAsMouse';

export type WeaveBrushLabOverlays = {
  raw: boolean;
  stabilized: boolean;
  final: boolean;
  pressure: boolean;
};

/** One pointer event with every sample it carried (coalesced ones included). */
export type LabGestureEvent = {
  /** Event time, in ms. */
  time: number;
  samples: LabPressurePoint[];
};

/** What the pointer did during one gesture, in container coordinates. */
export type LabGesture = { events: LabGestureEvent[] };

/** A stroke kept in memory for comparison. Never stored or sent anywhere. */
export type LabRecording = {
  profileKey: WeaveBrushInputProfileKey;
  gesture: LabGesture;
  strokeWidth: number;
  zoom: number;
};

/** What `compareLast` drew, or why it drew nothing. */
export type WeaveBrushLabCompareResult = {
  lines: number;
  events?: number;
  reason?: string;
};
