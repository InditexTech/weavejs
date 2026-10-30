// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
// Resolved to the SDK itself when published, so the lab extends the SDK's own
// WeavePlugin (see tsconfig `paths` and the lab build entry).
import { WeavePlugin } from '@inditextech/weave-sdk';
import {
  BRUSH_PROFILE_PRESETS,
  BRUSH_SCENARIOS,
  resolveBrushProfilePatch,
} from '@/actions/brush-tool/tunables/presets';
import type {
  WeaveBrushInputProfile,
  WeaveBrushInputProfileKey,
  WeaveBrushTraceSink,
} from '@/actions/brush-tool/types';
import {
  BRUSH_LAB_DEFAULT_MAX_GHOSTS,
  BRUSH_LAB_LAYER_ID,
  BRUSH_LAB_METRICS_EVENT,
  BRUSH_LAB_PLUGIN_NAME,
} from './constants';
import { DeviceReporter, type DevicePointerEvent } from './device-report';
import { RecordingStore, replayRecording } from './ghosts';
import { GestureRecorder } from './recorder';
import { computeStrokeMetrics } from './metrics';
import type {
  LabPressurePoint,
  LabRecordedSample,
  WeaveBrushLabDeviceReport,
  WeaveBrushLabCompareResult,
  WeaveBrushLabMetrics,
  WeaveBrushLabOverlays,
} from './types';

type CurrentStroke = {
  profileKey: WeaveBrushInputProfileKey;
  preset: string;
  scenario?: string;
  profile: WeaveBrushInputProfile;
  strokeWidth: number;
  zoom: number;
  samples: LabRecordedSample[];
  batchMs: number;
};

type LastStroke = {
  samples: LabRecordedSample[];
  finalPoints: LabPressurePoint[];
};

/**
 * Lab for tuning the brush on real devices. It listens to the brush tool and
 * draws overlays on a layer of its own. It never changes the document, and it
 * keeps everything it records in memory only: nothing is stored, sent or
 * written anywhere.
 */
export class WeaveBrushLabPlugin
  extends WeavePlugin
  implements WeaveBrushTraceSink
{
  private overlays: WeaveBrushLabOverlays = {
    raw: false,
    stabilized: false,
    final: false,
    pressure: false,
  };
  private reporter = new DeviceReporter();
  private recordings = new RecordingStore(BRUSH_LAB_DEFAULT_MAX_GHOSTS);
  private current: CurrentStroke | null = null;
  private last: LastStroke | null = null;
  private lastMetrics: WeaveBrushLabMetrics | null = null;
  private compareScenario: string | null = null;
  private recorder = new GestureRecorder();
  private listeners: [string, (e: PointerEvent) => void, boolean][] = [];
  private frameHandle: number | null = null;

  constructor(params?: { maxGhosts?: number }) {
    super();
    if (params?.maxGhosts) this.recordings.setMax(params.maxGhosts);
    this.initialize();
  }

  initialize(): void {
    this.enabled = true;
  }

  getName(): string {
    return BRUSH_LAB_PLUGIN_NAME;
  }

  getLayerName(): string {
    return BRUSH_LAB_LAYER_ID;
  }

  getLayer(): Konva.Layer | undefined {
    return this.instance?.getStage?.()?.findOne?.(`#${this.getLayerName()}`) as
      | Konva.Layer
      | undefined;
  }

  onInit(): void {
    const stage = this.instance.getStage();
    stage.add(
      new Konva.Layer({
        id: this.getLayerName(),
        draggable: false,
        listening: false,
      })
    );
    if (this.enabled) this.attach();
  }

  onRender(): void {
    // nothing to render on its own
  }

  enable(): void {
    this.enabled = true;
    this.attach();
    this.getLayer()?.show();
  }

  disable(): void {
    this.enabled = false;
    this.detach();
    this.getLayer()?.hide();
  }

  /** Pointer event position in the stage's drawing coordinates. */
  private toStagePoint(e: PointerEvent): { x: number; y: number } {
    const stage = this.instance.getStage();
    const rect = stage.container().getBoundingClientRect();
    return stage
      .getAbsoluteTransform()
      .copy()
      .invert()
      .point({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  private recorderEvent(e: PointerEvent) {
    const sources =
      typeof e.getCoalescedEvents === 'function' &&
      e.getCoalescedEvents().length > 0
        ? e.getCoalescedEvents()
        : [e];
    return {
      pointerId: e.pointerId,
      time: e.timeStamp,
      samples: sources.map((c) => ({
        ...this.toStagePoint(c),
        pressure: c.pressure,
        time:
          typeof c.timeStamp === 'number' && c.timeStamp > 0
            ? c.timeStamp
            : e.timeStamp,
      })),
    };
  }

  private attach(): void {
    const container = this.instance?.getStage?.()?.container?.();
    if (container && this.listeners.length === 0) {
      // On the window, in the capture phase: once a stroke starts, the app may
      // capture the pointer on another element, and a listener on the stage
      // container would then stop hearing the moves.
      const inStage = (e: PointerEvent) =>
        typeof e.composedPath === 'function'
          ? e.composedPath().includes(container)
          : true;
      const add = (type: string, fn: (e: PointerEvent) => void) => {
        window.addEventListener(type, fn as EventListener, {
          passive: true,
          capture: true,
        });
        this.listeners.push([type, fn, true]);
      };
      add('pointerdown', (e) => {
        if (inStage(e)) this.recorder.begin(this.recorderEvent(e));
      });
      add('pointermove', (e) => {
        if (inStage(e)) {
          this.reporter.record(e as unknown as DevicePointerEvent);
          this.reporter.setZoom(this.instance.getStage().scaleX());
        }
        this.recorder.add(this.recorderEvent(e));
      });
      add('pointerup', (e) => this.recorder.end(e.pointerId));
      add('pointercancel', (e) => this.recorder.end(e.pointerId));
    }
    if (
      this.frameHandle === null &&
      typeof requestAnimationFrame === 'function'
    ) {
      this.countFrames();
    }
  }

  private detach(): void {
    for (const [type, fn, capture] of this.listeners) {
      window.removeEventListener(type, fn as EventListener, { capture });
    }
    this.listeners = [];
    if (
      this.frameHandle !== null &&
      typeof cancelAnimationFrame === 'function'
    ) {
      cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle = null;
  }

  private countFrames(): void {
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - since >= 1000) {
        this.reporter.setFps((frames * 1000) / (now - since));
        frames = 0;
        since = now;
      }
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }

  // -- reading ----------------------------------------------------------

  getDeviceReport(): WeaveBrushLabDeviceReport {
    return this.reporter.report();
  }

  getLastMetrics(): WeaveBrushLabMetrics | null {
    return this.lastMetrics;
  }

  getOverlays(): WeaveBrushLabOverlays {
    return { ...this.overlays };
  }

  getRecordingCount(): number {
    return this.recordings.size;
  }

  // -- overlays ---------------------------------------------------------

  setOverlay(name: keyof WeaveBrushLabOverlays, on: boolean): void {
    this.overlays[name] = on;
    this.redraw();
  }

  // -- ghosts -----------------------------------------------------------

  setMaxGhosts(max: number): void {
    this.recordings.setMax(max);
    this.redraw();
  }

  /**
   * Draws the last stroke again through each named brush (every one when none
   * are given), so the same handwriting can be compared across them.
   */
  compareLast(scenarioId: string): WeaveBrushLabCompareResult {
    if (!BRUSH_SCENARIOS.some((x) => x.id === scenarioId)) {
      return { lines: 0, reason: `Unknown brush "${scenarioId}"` };
    }
    this.compareScenario = scenarioId;
    const recording = this.recordings.last();
    if (!recording) {
      return { lines: 0, reason: 'No stroke recorded yet: draw one first' };
    }
    const events = recording.gesture.events.length;
    if (events === 0) {
      return {
        lines: 0,
        reason: 'The stroke has no pointer events (nothing was recorded)',
      };
    }
    this.redraw();
    const lines = this.getLayer()?.find('.lab-ghost').length ?? 0;
    return lines > 0
      ? { lines, events }
      : { lines: 0, events, reason: 'No brush produced a line' };
  }

  /** Forgets every kept stroke and removes the ghosts. */
  clearGhosts(): void {
    this.recordings.clear();
    this.compareScenario = null;
    this.redraw();
  }

  // -- brush tool sink ----------------------------------------------------

  onStrokeStart(
    info: Parameters<WeaveBrushTraceSink['onStrokeStart']>[0]
  ): void {
    this.reporter.setResolvedProfile(info.profile);
    this.current = {
      profileKey: info.profile,
      preset: info.preset,
      ...(info.scenario ? { scenario: info.scenario } : {}),
      profile: info.profileConfig,
      strokeWidth: info.strokeWidth,
      zoom: info.zoom,
      samples: [],
      batchMs: 0,
    };
    this.getLayer()?.destroyChildren();
    this.last = null;
    this.compareScenario = null;
  }

  onSample(sample: LabRecordedSample): void {
    if (!this.current) return;
    this.current.samples.push(sample);

    if (sample.predicted) return;
    const layer = this.getLayer();
    if (!layer) return;
    const r = this.markerRadius();
    if (this.overlays.raw) {
      layer.add(
        new Konva.Circle({
          x: sample.raw.x,
          y: sample.raw.y,
          radius: r,
          fill: '#ef4444',
          name: 'lab-raw',
        })
      );
    }
    if (this.overlays.stabilized) {
      layer.add(
        new Konva.Circle({
          x: sample.stabilized.x,
          y: sample.stabilized.y,
          radius: r,
          fill: '#2563eb',
          name: 'lab-stabilized',
        })
      );
    }
    layer.batchDraw();
  }

  onBatch(info: { ms: number; samples: number }): void {
    if (this.current) this.current.batchMs += info.ms;
  }

  onStrokeEnd(info: Parameters<WeaveBrushTraceSink['onStrokeEnd']>[0]): void {
    const current = this.current;
    this.current = null;
    if (!current) return;

    const measured = computeStrokeMetrics({
      samples: current.samples,
      beforeFinalize: info.beforeFinalize,
      finalPoints: info.finalPoints,
      strokeWidth: info.strokeWidth,
      drawMs: current.batchMs + info.finalizeMs,
    });

    const metrics: WeaveBrushLabMetrics = {
      profile: current.profileKey,
      preset: current.preset,
      ...(current.scenario ? { scenario: current.scenario } : {}),
      ...measured,
    };
    this.lastMetrics = metrics;

    this.recordings.add({
      profileKey: current.profileKey,
      gesture: this.recorder.snapshot(),
      strokeWidth: current.strokeWidth,
      zoom: current.zoom,
    });
    this.last = { samples: current.samples, finalPoints: info.finalPoints };

    this.instance.emitEvent<WeaveBrushLabMetrics>(
      BRUSH_LAB_METRICS_EVENT,
      metrics
    );
    this.redraw();
  }

  // -- drawing ------------------------------------------------------------

  private markerRadius(): number {
    const zoom = this.instance.getStage().scaleX();
    return 2 / (zoom > 0 ? zoom : 1);
  }

  private redraw(): void {
    const layer = this.getLayer();
    if (!layer) return;
    layer.destroyChildren();

    const r = this.markerRadius();
    const last = this.last;

    if (last) {
      const real = last.samples.filter((s) => !s.predicted);
      if (this.overlays.raw) {
        for (const s of real) {
          layer.add(
            new Konva.Circle({
              x: s.raw.x,
              y: s.raw.y,
              radius: r,
              fill: '#ef4444',
              name: 'lab-raw',
            })
          );
        }
      }
      if (this.overlays.stabilized) {
        for (const s of real) {
          layer.add(
            new Konva.Circle({
              x: s.stabilized.x,
              y: s.stabilized.y,
              radius: r,
              fill: '#2563eb',
              name: 'lab-stabilized',
            })
          );
        }
      }
      if (this.overlays.final) {
        for (const p of last.finalPoints) {
          layer.add(
            new Konva.Circle({
              x: p.x,
              y: p.y,
              radius: r * 1.5,
              stroke: '#16a34a',
              strokeWidth: r / 2,
              name: 'lab-final',
            })
          );
        }
      }
      if (this.overlays.pressure && last.finalPoints.length > 1) {
        const bottom = Math.max(...last.finalPoints.map((p) => p.y)) + 30 * r;
        const flat: number[] = [];
        for (const p of last.finalPoints)
          flat.push(p.x, bottom - p.pressure * 20 * r);
        layer.add(
          new Konva.Line({
            points: flat,
            stroke: '#a855f7',
            strokeWidth: r,
            name: 'lab-pressure',
          })
        );
      }
    }

    const recording = this.recordings.last();
    if (recording && this.compareScenario) {
      const scenario = BRUSH_SCENARIOS.find(
        (x) => x.id === this.compareScenario
      );
      const preset = scenario
        ? BRUSH_PROFILE_PRESETS[recording.profileKey].find(
            (p) => p.id === scenario.profiles[recording.profileKey]
          )
        : undefined;
      const toFlat = (pts: { x: number; y: number }[]) =>
        pts.flatMap((p) => [p.x, p.y]);

      // what was actually drawn, in black, under the chosen brush in red
      if (this.last && this.last.finalPoints.length > 1) {
        layer.add(
          new Konva.Line({
            points: toFlat(this.last.finalPoints),
            stroke: '#111111',
            strokeWidth: r * 2.5,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.9,
            name: 'lab-actual',
          })
        );
      }
      if (scenario && preset) {
        const points = replayRecording(
          recording,
          resolveBrushProfilePatch(preset.patch),
          1
        );
        if (points.length >= 2) {
          layer.add(
            new Konva.Line({
              points: toFlat(points),
              stroke: '#e11d48',
              strokeWidth: r,
              lineCap: 'round',
              lineJoin: 'round',
              name: 'lab-ghost',
            })
          );
          layer.add(
            new Konva.Text({
              x: points[0].x,
              y: points[0].y - 14 * r,
              text: `${scenario.label.replace(
                /^[A-Z]: /,
                ''
              )} (red) vs drawn (black)`,
              fontSize: 10 * r,
              fill: '#e11d48',
              name: 'lab-ghost-label',
            })
          );
        }
      }
    }

    layer.moveToTop();
    layer.batchDraw();
  }
}
