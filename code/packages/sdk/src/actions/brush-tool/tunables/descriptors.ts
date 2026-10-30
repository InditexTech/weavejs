// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushTunable } from './types';

type Spec = Omit<WeaveBrushTunable, 'key' | 'path' | 'scope'>;

const profile = (key: string, spec: Spec): WeaveBrushTunable => ({
  key,
  scope: 'profile',
  path: key.split('.'),
  ...spec,
});

const look = (key: string, spec: Spec): WeaveBrushTunable => ({
  key,
  scope: 'look',
  path: key.split('.'),
  ...spec,
});

/** Every setting accepted by an input profile. */
export const BRUSH_PROFILE_TUNABLES: WeaveBrushTunable[] = [
  profile('capture.source', {
    stage: 'capture', group: 'Capture', kind: 'capture', type: 'enum',
    default: 'legacy', options: ['legacy', 'coalesced'],
    help: 'legacy keeps one position per event; coalesced keeps every batched pen sample with its own position.',
  }),
  profile('capture.clock', {
    stage: 'capture', group: 'Capture', kind: 'capture', type: 'enum',
    default: 'now', options: ['now', 'event'],
    help: 'Time base of time-dependent filters: processing time or the time reported by each sample.',
  }),
  profile('capture.minMovePx', {
    stage: 'capture', group: 'Capture', kind: 'capture', type: 'number',
    default: 0, min: 0, max: 3, step: 0.1, unit: 'px',
    help: 'Samples closer than this to the last recorded one are skipped.',
  }),
  profile('capture.predicted', {
    stage: 'capture', group: 'Capture', kind: 'capture', type: 'enum',
    default: 'tail', options: ['off', 'tail'],
    help: 'Draw the browser-predicted tail ahead of the pen to hide latency.',
  }),
  profile('capture.event', {
    stage: 'capture', group: 'Capture', kind: 'capture', type: 'enum',
    default: 'pointermove', options: ['pointermove', 'pointerrawupdate'],
    help: 'Event that delivers samples. pointerrawupdate lowers latency where supported.',
    advanced: true,
  }),
  profile('pressure.zero', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'enum',
    default: 'legacy', options: ['legacy', 'keep', 'holdLast'],
    help: 'How a pen pressure of 0 is treated: legacy replaces it with 0.5, keep records it, holdLast repeats the last non-zero value.',
  }),
  profile('pressure.filter', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'enum',
    default: 'legacy', options: ['legacy', 'timeEma', 'oneEuro', 'none'],
    help: 'Pressure smoothing: the legacy velocity-adaptive filter, a time-based one, the One Euro filter, or none.',
  }),
  profile('pressure.timeConstantMs', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'number',
    default: 40, min: 1, max: 500, step: 1, unit: 'ms',
    help: 'Time constant of the timeEma filter; larger is smoother and slower.',
  }),
  profile('pressure.oneEuro.minCutoff', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'number',
    default: 1, min: 0.01, max: 10, step: 0.01, unit: 'Hz',
    help: 'One Euro minimum cutoff: lower removes more jitter at slow speed.',
    advanced: true,
  }),
  profile('pressure.oneEuro.beta', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'number',
    default: 0.01, min: 0, max: 1, step: 0.001,
    help: 'One Euro speed coefficient: higher removes more lag at high speed.',
    advanced: true,
  }),
  profile('pressure.floor', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'number',
    default: 0.15, min: 0, max: 0.5, step: 0.01, unit: 'fraction',
    help: 'Lowest pressure that is recorded; prevents invisible strokes.',
  }),
  profile('pressure.start', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'enum',
    default: 'backfill', options: ['backfill', 'average', 'none'],
    help: 'First point: backfill takes the next real sample, average takes the mean of the first movement readings, none keeps the contact reading.',
  }),
  profile('pressure.startSamples', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'number',
    default: 3, min: 1, max: 10, step: 1, integer: true, unit: 'count',
    help: 'Number of readings averaged by the average start policy.',
    advanced: true,
  }),
  profile('pressure.end', {
    stage: 'pressure', group: 'Pressure', kind: 'capture', type: 'enum',
    default: 'backfill', options: ['backfill', 'none'],
    help: 'Last point: backfill takes the second-to-last pressure, none keeps the lift-off reading.',
  }),
  profile('stabilizer.type', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'enum',
    default: 'none', options: ['none', 'oneEuro', 'pulledString', 'streamline'],
    help: 'Smooths the pen position while drawing.',
  }),
  profile('stabilizer.minCutoff', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'number',
    default: 3, min: 0.1, max: 20, step: 0.1, unit: 'Hz',
    help: 'One Euro minimum cutoff: lower removes more jitter at slow speed.',
  }),
  profile('stabilizer.beta', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'number',
    default: 0.01, min: 0, max: 1, step: 0.001,
    help: 'One Euro speed coefficient: higher removes more lag at high speed.',
  }),
  profile('stabilizer.radiusPx', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'number',
    default: 4, min: 0, max: 40, step: 0.5, unit: 'px',
    help: 'Pulled string leash length: the pen must move this far before the line follows.',
  }),
  profile('stabilizer.amount', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'number',
    default: 0.3, min: 0, max: 1, step: 0.01, unit: 'fraction',
    help: 'Streamline strength: 0 follows the pen exactly, 1 is the strongest smoothing.',
  }),
  profile('stabilizer.zoomAware', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'boolean',
    default: false,
    help: 'Interpret the distances in screen pixels, so the effect on screen is the same at every zoom level. Off: canvas units.',
  }),
  profile('stabilizer.catchUpOnEnd', {
    stage: 'stabilizer', group: 'Stabilizer', kind: 'capture', type: 'boolean',
    default: true,
    help: 'Complete the stroke at the position where the pen was lifted.',
  }),
  profile('finalize.mode', {
    stage: 'finalize', group: 'Finish', kind: 'capture', type: 'enum',
    default: 'dp', options: ['dp', 'dpPressure', 'bezierFit', 'none'],
    help: 'How points are reduced when the stroke ends: simplification, simplification keeping pressure detail, curve fitting, or nothing.',
  }),
  profile('finalize.tolerance', {
    stage: 'finalize', group: 'Finish', kind: 'capture', type: 'number',
    default: null, nullable: true, min: 0, max: 20, step: 0.05,
    help: 'Tolerance of the finishing step. Empty uses the tool-level tolerance.',
  }),
  profile('finalize.toleranceUnit', {
    stage: 'finalize', group: 'Finish', kind: 'capture', type: 'enum',
    default: 'canvas', options: ['canvas', 'screen'],
    help: 'canvas: tolerance in canvas units. screen: in pixels, converted with the zoom when the stroke ends.',
  }),
  profile('finalize.pressureWeight', {
    stage: 'finalize', group: 'Finish', kind: 'capture', type: 'number',
    default: 20, min: 0, max: 200, step: 1,
    help: 'Distance units per pressure unit when simplification keeps pressure detail.',
    advanced: true,
  }),
  profile('finalize.resampleSpacingPx', {
    stage: 'finalize', group: 'Finish', kind: 'capture', type: 'number',
    default: 2, min: 0.5, max: 20, step: 0.5, unit: 'px',
    help: 'Spacing of the points a fitted curve is resampled to.',
    advanced: true,
  }),
  profile('touchGuard.waitMs', {
    stage: 'touch', group: 'Finger', kind: 'capture', type: 'number',
    default: 0, min: 0, max: 500, step: 10, unit: 'ms',
    help: 'Wait before a finger stroke is committed, so a second finger can cancel it.',
  }),
  profile('touchGuard.movePx', {
    stage: 'touch', group: 'Finger', kind: 'capture', type: 'number',
    default: 0, min: 0, max: 40, step: 1, unit: 'px',
    help: 'Movement that commits the stroke before the wait ends.',
  }),
  profile('touchGuard.cancelOnSecondTouch', {
    stage: 'touch', group: 'Finger', kind: 'capture', type: 'boolean',
    default: false,
    help: 'Cancel the stroke when a second finger lands during the wait.',
  }),
  profile('touchGuard.ignoreAfterPen', {
    stage: 'touch', group: 'Finger', kind: 'capture', type: 'boolean',
    default: false,
    help: 'Finger input does not draw once a pen has been used.',
  }),
];

/** Every setting accepted by a stroke look. */
export const BRUSH_LOOK_TUNABLES: WeaveBrushTunable[] = [
  look('outline', {
    stage: 'outline', group: 'Outline', kind: 'draw', type: 'enum',
    default: 'legacy', options: ['legacy', 'round', 'freehand'],
    help: 'Shape of the stroke: legacy ribbon, round (discs and segments, no spikes) or freehand.',
  }),
  look('curve', {
    stage: 'curve', group: 'Curve', kind: 'draw', type: 'enum',
    default: 'uniform', options: ['uniform', 'centripetal', 'none'],
    help: 'Curve through the points. centripetal does not overshoot when points are unevenly spaced.',
  }),
  look('pressureInterp', {
    stage: 'curve', group: 'Curve', kind: 'draw', type: 'enum',
    default: 'catmullRom', options: ['catmullRom', 'linear'],
    help: 'How pressure is interpolated between points. linear never bulges.',
  }),
  look('zoomAware', {
    stage: 'detail', group: 'Detail', kind: 'draw', type: 'boolean',
    default: false,
    help: 'Choose spacing and subdivision in screen pixels so smoothness does not depend on zoom.',
  }),
  look('spacingPx', {
    stage: 'detail', group: 'Detail', kind: 'draw', type: 'number',
    default: 2, min: 0.5, max: 10, step: 0.5, unit: 'px',
    help: 'Minimum spacing between control points.',
    advanced: true,
  }),
  look('edgePx', {
    stage: 'detail', group: 'Detail', kind: 'draw', type: 'number',
    default: 1, min: 0.25, max: 5, step: 0.25, unit: 'px',
    help: 'Detail of the curve. The centripetal curve keeps every edge within a tenth of this of the true curve; the uniform curve uses it as the target length of an edge.',
    advanced: true,
  }),
  look('caps', {
    stage: 'ends', group: 'Ends', kind: 'draw', type: 'enum',
    default: 'separate', options: ['separate', 'merged'],
    help: 'merged draws the round ends inside the same fill, so translucent colours stay uniform.',
  }),
  look('width.min', {
    stage: 'width', group: 'Width', kind: 'draw', type: 'number',
    default: 0, min: 0, max: 1, step: 0.01, unit: 'fraction',
    help: 'Width at pressure 0, as a fraction of the stroke width.',
  }),
  look('width.max', {
    stage: 'width', group: 'Width', kind: 'draw', type: 'number',
    default: 1, min: 0, max: 1, step: 0.01, unit: 'fraction',
    help: 'Width at pressure 1, as a fraction of the stroke width.',
  }),
  look('width.gamma', {
    stage: 'width', group: 'Width', kind: 'draw', type: 'number',
    default: 1, min: 0.2, max: 3, step: 0.05,
    help: 'Response curve: below 1 reacts faster to light pressure, above 1 needs a firmer press.',
  }),
  look('width.taperStart', {
    stage: 'width', group: 'Width', kind: 'draw', type: 'number',
    default: 0, min: 0, max: 200, step: 1, unit: 'px',
    help: 'Distance over which the start narrows; 0 for none.',
  }),
  look('width.taperEnd', {
    stage: 'width', group: 'Width', kind: 'draw', type: 'number',
    default: 0, min: 0, max: 200, step: 1, unit: 'px',
    help: 'Distance over which the end narrows; 0 for none.',
  }),
];

/** Every tunable setting. */
export const BRUSH_TUNABLES: WeaveBrushTunable[] = [
  ...BRUSH_PROFILE_TUNABLES,
  ...BRUSH_LOOK_TUNABLES,
];

/** Finds a tunable by scope and key. */
export function getBrushTunable(
  scope: 'profile' | 'look',
  key: string
): WeaveBrushTunable | undefined {
  return BRUSH_TUNABLES.find((t) => t.scope === scope && t.key === key);
}
