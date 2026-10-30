// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import type { Weave } from '@/weave';
import {
  type WeaveBrushToolActionOnAddedEvent,
  type WeaveBrushToolActionOnAddingEvent,
  type WeaveBrushToolActionParams,
  type WeaveBrushToolActionProperties,
  type WeaveBrushToolActionState,
} from './types';
import {
  BRUSH_TOOL_ACTION_NAME,
  BRUSH_TOOL_DEFAULT_CONFIG,
  BRUSH_TOOL_STATE,
  PREVIEW_HANDOVER_MAX_FRAMES,
  PREVIEW_ID_SUFFIX,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { mergeExceptArrays } from '@/utils/utils';
import { createStabilizer, type BrushStabilizer } from './stages/stabilizer';
import {
  applyEndPolicy,
  applyStartPolicy,
  getRawPressure,
  peekPredictedPressure,
  resetPressureState,
  smoothPressure,
  type PressureState,
} from './stages/pressure';
import {
  captureCoalescedSamples,
  captureLegacySamples,
  createCaptureState,
  type CapturedSample,
  type CaptureState,
} from './stages/capture';
import { finalizePoints } from './stages/finalize';
import { detectBrushPlatform, resolveBrushInputProfileKey } from './profiles';
import { validateBrushTunablePatch } from './tunables/validate';
import { mergeData } from './tunables/merge';
import {
  BRUSH_CONFIG_DOCUMENT_VERSION,
  parseBrushConfigDocument,
  type WeaveBrushConfigDocument,
} from './tunables/config-io';
import {
  getBrushScenario,
  resolveBrushLookPatch,
  resolveBrushProfilePatch,
  WeaveBrushPresetRegistry,
  type WeaveBrushScenario,
  type WeaveStrokeLookPatch,
} from './tunables/presets';
import { WEAVE_STROKE_LEGACY_LOOK } from '@/nodes/stroke/constants';
import type { WeaveStrokeLook } from '@/nodes/stroke/types';
import {
  BRUSH_LAB_PLUGIN_NAME,
} from './constants';
import type {
  WeaveBrushTraceSink,
  WeaveBrushInputConfig,
  WeaveBrushInputProfile,
  WeaveBrushInputProfileKey,
  WeaveBrushInputProfilePatch,
  WeaveBrushSetResult,
  WeaveStrokeInputMeta,
} from './types';

type MousePointInfo = ReturnType<Weave['getMousePointer']>;

/** A pointer move kept while a finger stroke waits to be committed. */
type BufferedMove = {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  pressure: number;
  timeStamp: number;
  coalesced: Pick<
    PointerEvent,
    'pointerType' | 'pressure' | 'clientX' | 'clientY' | 'timeStamp'
  >[];
};

/** A finger that is down but whose stroke has not been committed yet. */
type PendingTouch = {
  pointerId: number;
  startClient: { x: number; y: number };
  pressure: number;
  time: number;
  /** Where the finger touched down, and the container under it. */
  start: MousePointInfo;
  samples: BufferedMove[];
  timer: ReturnType<typeof setTimeout> | null;
};

export class WeaveBrushToolAction extends WeaveAction {
  protected config: WeaveBrushToolActionProperties;
  protected initialized: boolean = false;
  protected state!: WeaveBrushToolActionState;
  protected clickPoint!: Konva.Vector2d | null;
  protected strokeId!: string | null;
  protected isSpacePressed: boolean = false;
  protected isEraser!: boolean;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  protected prevTouchAction!: string;
  protected penActive = false;
  protected lastSmoothedPressure = 0.5;
  protected hasPressureSample = false;
  protected lastPointerPos: { x: number; y: number } | null = null;
  protected lastPointerTime = 0;
  protected predictedCount = 0;
  protected activeProfile!: WeaveBrushInputProfile;
  protected activeProfileKey: WeaveBrushInputProfileKey = 'mouse';
  protected look: WeaveStrokeLook | null = null;
  protected captureState: CaptureState = createCaptureState();
  protected pendingTouch: PendingTouch | null = null;
  /** Preset each profile currently holds: a preset id, `custom` or `imported`. */
  protected presetIds: Record<WeaveBrushInputProfileKey, string> = {
    mouse: 'legacy',
    touch: 'legacy',
    'pen.applePencil': 'legacy',
    'pen.desktop': 'legacy',
  };
  /** Scenario applied last, until a profile is changed on its own. */
  protected scenarioId: string | null = null;
  /** Pointer that is drawing the stroke in progress. */
  protected strokePointerId: number | null = null;
  /** A pen has been used since the tool was activated. */
  protected penSeen = false;
  /** Last position the pen reported, before any stabilizing. */
  protected lastRawPoint: { x: number; y: number } | null = null;
  protected stabilizer!: BrushStabilizer;
  private pressureStateView?: PressureState;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveBrushToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      BRUSH_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    for (const key of Object.keys(
      params?.config?.input?.profiles ?? {}
    ) as WeaveBrushInputProfileKey[]) {
      this.presetIds[key] = 'custom';
    }

    this.initialize();
  }

  initialize(): void {
    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.strokeId = null;
    this.clickPoint = null;
    this.container = undefined;
    this.isEraser = false;
    this.measureContainer = undefined;
    this.props = this.initProps();
    this.isSpacePressed = false;
    this.setActiveProfile('mouse');
  }

  private setActiveProfile(key: WeaveBrushInputProfileKey): void {
    this.activeProfileKey = key;
    this.activeProfile = this.config.input.profiles[key];
    this.stabilizer = createStabilizer(this.activeProfile.stabilizer);
  }

  /** Key of the profile used by the stroke in progress, or the last one. */
  getActiveProfileKey(): WeaveBrushInputProfileKey {
    return this.activeProfileKey;
  }

  /** Preset a profile currently holds: a preset id, `custom` or `imported`. */
  getPresetId(key: WeaveBrushInputProfileKey): string {
    return this.presetIds[key];
  }

  /** Scenario applied last, or `null` once a profile was changed on its own. */
  getScenarioId(): string | null {
    return this.scenarioId;
  }

  /**
   * How a stroke was drawn, recorded on it only while the lab plugin is
   * active, so ordinary documents carry no such data.
   */
  private getInputMeta(): WeaveStrokeInputMeta | undefined {
    const lab = this.instance.getPlugin<{ isEnabled?: () => boolean }>(
      BRUSH_LAB_PLUGIN_NAME
    );
    if (!lab || lab.isEnabled?.() === false) return undefined;

    return {
      profile: this.activeProfileKey,
      preset: this.presetIds[this.activeProfileKey],
      ...(this.scenarioId ? { scenario: this.scenarioId } : {}),
    };
  }

  /** The lab plugin, when it is registered and on; it only listens. */
  private getTraceSink(): WeaveBrushTraceSink | null {
    const lab = this.instance.getPlugin<Partial<WeaveBrushTraceSink>>(
      BRUSH_LAB_PLUGIN_NAME
    );
    if (!lab || lab.isEnabled?.() === false) return null;
    return typeof lab.onSample === 'function'
      ? (lab as WeaveBrushTraceSink)
      : null;
  }

  /** Current configuration of a profile (a copy). */
  getInputProfile(key: WeaveBrushInputProfileKey): WeaveBrushInputProfile {
    return mergeExceptArrays(this.config.input.profiles[key], {});
  }

  /**
   * Changes a profile's configuration. The change applies from the next
   * stroke: the profile object is replaced, never mutated, so a stroke in
   * progress keeps the configuration it started with.
   */
  setInputProfile(
    key: WeaveBrushInputProfileKey,
    patch: WeaveBrushInputProfilePatch
  ): WeaveBrushSetResult {
    if (!(key in this.config.input.profiles)) {
      return { applied: false, errors: [`Unknown profile "${key}"`] };
    }

    // A patch is applied only when every value in it is valid.
    const errors = validateBrushTunablePatch('profile', patch);
    if (errors.length > 0) {
      return { applied: false, errors };
    }

    this.config.input.profiles[key] = mergeExceptArrays(
      this.config.input.profiles[key],
      patch
    );
    this.presetIds[key] = 'custom';
    this.scenarioId = null;

    return { applied: true, errors: [] };
  }

  /** The profiles and the look as a portable, versioned document. */
  exportConfig(): WeaveBrushConfigDocument {
    return {
      version: BRUSH_CONFIG_DOCUMENT_VERSION,
      profiles: {
        mouse: this.getInputProfile('mouse'),
        touch: this.getInputProfile('touch'),
        'pen.applePencil': this.getInputProfile('pen.applePencil'),
        'pen.desktop': this.getInputProfile('pen.desktop'),
      },
      look: this.getLook(),
    };
  }

  /** The configuration as JSON text. */
  exportConfigJson(): string {
    return JSON.stringify(this.exportConfig(), null, 2);
  }

  /**
   * Restores a configuration exported with `exportConfig`, given as an object
   * or JSON text. A document with an unsupported version or invalid values is
   * rejected as a whole and nothing changes.
   */
  importConfig(input: unknown): WeaveBrushSetResult {
    const parsed = parseBrushConfigDocument(input);
    if (!parsed.ok) {
      return { applied: false, errors: parsed.errors };
    }

    Object.assign(this.config.input.profiles, parsed.profiles);
    for (const key of Object.keys(parsed.profiles) as WeaveBrushInputProfileKey[]) {
      this.presetIds[key] = 'imported';
    }
    this.scenarioId = null;
    if (parsed.look !== undefined) {
      this.look = parsed.look;
    }
    return { applied: true, errors: [] };
  }

  /** Look saved on every new stroke, or `null` when none is saved. */
  getLook(): WeaveStrokeLook | null {
    return this.look ? mergeData(this.look, {}) : null;
  }

  /**
   * Changes the look saved on new strokes, or clears it with `null` so new
   * strokes carry no look and are drawn as in earlier releases. Strokes
   * already drawn keep the look they were saved with.
   */
  setLook(patch: WeaveStrokeLookPatch | null): WeaveBrushSetResult {
    if (patch === null) {
      this.look = null;
      return { applied: true, errors: [] };
    }

    const errors = validateBrushTunablePatch('look', patch);
    if (errors.length > 0) {
      return { applied: false, errors };
    }

    this.look = mergeData(this.look ?? WEAVE_STROKE_LEGACY_LOOK, patch);
    return { applied: true, errors: [] };
  }

  /**
   * Applies a scenario: one preset for each profile and one look preset.
   * Custom presets are looked up in `registry` when given.
   */
  applyScenario(
    scenario: string | WeaveBrushScenario,
    registry: WeaveBrushPresetRegistry = new WeaveBrushPresetRegistry()
  ): WeaveBrushSetResult {
    const resolved =
      typeof scenario === 'string' ? getBrushScenario(scenario) : scenario;
    if (!resolved) {
      return { applied: false, errors: [`Unknown scenario "${scenario}"`] };
    }

    const errors: string[] = [];
    const profiles = {} as Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>;
    for (const key of Object.keys(this.config.input.profiles) as WeaveBrushInputProfileKey[]) {
      const preset = registry.getProfilePreset(key, resolved.profiles[key]);
      if (!preset) {
        errors.push(`Unknown preset "${resolved.profiles[key]}" for profile "${key}"`);
        continue;
      }
      profiles[key] = resolveBrushProfilePatch(preset.patch);
    }
    const lookPreset = registry.getLookPreset(resolved.look);
    if (!lookPreset) errors.push(`Unknown look preset "${resolved.look}"`);

    if (errors.length > 0 || !lookPreset) {
      return { applied: false, errors };
    }

    // Applied only when the whole scenario could be resolved.
    Object.assign(this.config.input.profiles, profiles);
    this.presetIds = { ...resolved.profiles };
    this.scenarioId = resolved.id;
    this.look = resolveBrushLookPatch(lookPreset.patch);
    return { applied: true, errors: [] };
  }

  /** Forces a profile for every stroke, or `null` to resolve automatically. */
  setForcedProfile(key: WeaveBrushInputProfileKey | null): void {
    this.config.input.forceProfile = key;
  }

  /** Replaces the automatic profile resolution; `undefined` restores it. */
  setProfileResolver(resolver: WeaveBrushInputConfig['resolveProfile']): void {
    this.config.input.resolveProfile = resolver;
  }

  /**
   * The pressure-smoothing state, as a view over this action's own fields so
   * the stage functions mutate the same state the action exposes.
   */
  private get pressureState(): PressureState {
    if (!this.pressureStateView) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.pressureStateView = {
        get lastSmoothedPressure() {
          return self.lastSmoothedPressure;
        },
        set lastSmoothedPressure(v: number) {
          self.lastSmoothedPressure = v;
        },
        get hasPressureSample() {
          return self.hasPressureSample;
        },
        set hasPressureSample(v: boolean) {
          self.hasPressureSample = v;
        },
        get lastPointerPos() {
          return self.lastPointerPos;
        },
        set lastPointerPos(v: { x: number; y: number } | null) {
          self.lastPointerPos = v;
        },
        get lastPointerTime() {
          return self.lastPointerTime;
        },
        set lastPointerTime(v: number) {
          self.lastPointerTime = v;
        },
        get predictedCount() {
          return self.predictedCount;
        },
        set predictedCount(v: number) {
          self.predictedCount = v;
        },
        lastDerivative: 0,
        lastNonZeroPressure: null,
      };
    }
    return this.pressureStateView;
  }

  getName(): string {
    return BRUSH_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
    };
  }

  /**
   * Smooths one raw pressure sample with the filter of the active profile.
   *
   * This is the one place pressure smoothing happens: every sample that
   * becomes a stroke point, including the high-frequency coalesced samples a
   * stylus reports, goes through it so the smoothing state advances for later
   * samples.
   */
  private smoothPressureSample(
    raw: number,
    clientX: number,
    clientY: number,
    time?: number
  ): number {
    return smoothPressure(
      this.pressureState,
      this.activeProfile.pressure,
      raw,
      clientX,
      clientY,
      this.sampleTime(time)
    );
  }

  /**
   * Time of a sample, in ms. With the `event` clock it is the time the sample's
   * own event reported, so processing a batch in one step does not change the
   * time between its samples; otherwise (or when the event reports no usable
   * time) it is the time of processing.
   */
  private sampleTime(eventTime?: number): number {
    if (
      this.activeProfile.capture.clock === 'event' &&
      typeof eventTime === 'number' &&
      Number.isFinite(eventTime)
    ) {
      return eventTime;
    }
    return performance.now();
  }

  /**
   * Raw pressure a pointer sample reports: the device's own reading for a
   * pen, a neutral constant for devices that do not sense pressure.
   */
  private getRawPressure(
    pointerType: string,
    pressure: unknown,
    commit = true
  ): number {
    return getRawPressure(
      pointerType,
      pressure,
      this.activeProfile.pressure.zero,
      this.pressureState,
      commit
    );
  }

  private getEventPressure(e: Konva.KonvaEventObject<PointerEvent>) {
    return this.smoothPressureSample(
      this.getRawPressure(e.evt.pointerType, e.evt.pressure),
      e.evt.clientX,
      e.evt.clientY,
      e.evt.timeStamp
    );
  }

  /**
   * Resets the stroke-scoped state (pressure smoothing, predicted-point
   * bookkeeping and the position stabilizer) to a neutral baseline.
   *
   * This state belongs to a single stroke: it must be reset before the first
   * pressure sample of a new stroke is computed (in `handlePointerDown`, ahead
   * of the `getEventPressure` call for point 0), not only afterwards -
   * otherwise that first sample can inherit state left behind by the previous
   * stroke, inflating the very first point's pressure.
   */
  private resetPressureSmoothingState() {
    resetPressureState(this.pressureState);
    this.captureState = createCaptureState();
    this.lastRawPoint = null;
    this.stabilizer.reset();
  }

  /**
   * Maps a client position to the stroke container the same way the stage maps
   * its own pointer position (content rectangle, then the inverse of the
   * container's absolute transform), without changing any stage state.
   */
  private clientToContainer(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const content = this.instance.getStage().getContent();
    const rect = content.getBoundingClientRect();
    const scaleX = rect.width / content.clientWidth || 1;
    const scaleY = rect.height / content.clientHeight || 1;
    const transform = this.measureContainer!.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point({
      x: (clientX - rect.left) / scaleX,
      y: (clientY - rect.top) / scaleY,
    });
  }

  /** Captures the samples of one pointer move into the stroke in progress. */
  private handleMoveEvent(e: Konva.KonvaEventObject<PointerEvent>): void {
  // Samples a pen reports in a batch are smoothed through the same path as
    // any other sample, and the whole burst is applied in one write.
    const deps = {
      smooth: (
        raw: number,
        clientX: number,
        clientY: number,
        time?: number
      ) => this.smoothPressureSample(raw, clientX, clientY, time),
      rawPressure: (
        pointerType: string,
        pressure: unknown,
        commit?: boolean
      ) => this.getRawPressure(pointerType, pressure, commit),
      predictedPressure: (raw: number) =>
        peekPredictedPressure(
          this.pressureState,
          this.activeProfile.pressure,
          raw
        ),
    };

    if (this.activeProfile.capture.source === 'coalesced') {
      this.applyMovementSamples(
        captureCoalescedSamples(
          e.evt,
          {
            ...deps,
            toContainerPoint: (clientX, clientY) =>
              this.clientToContainer(clientX, clientY),
          },
          this.activeProfile.capture,
          this.captureState
        )
      );
    } else {
      const samples = captureLegacySamples(e.evt, deps);

      if (samples) {
        this.applyMovementSamples(samples);
      } else {
        const pointPressure = this.getEventPressure(e);
        this.handleMovement(pointPressure, undefined, false);
      }
    }
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    this.prevTouchAction = stage.container().style.touchAction;
    stage.container().style.touchAction = 'none';

    window.addEventListener(
      'keyup',
      (e) => {
        if (
          e.code === 'Space' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          this.isSpacePressed = false;
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.code === 'Enter' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.cancelAction();
          return;
        }
        if (
          e.code === 'Space' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.isSpacePressed = true;
          return;
        }
        if (
          e.code === 'Escape' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.cancelAction();
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state === BRUSH_TOOL_STATE.INACTIVE) return;

      // A second finger while a finger stroke waits to be committed: it is a
      // gesture, not a stroke.
      if (
        this.pendingTouch &&
        e.evt.pointerType === 'touch' &&
        e.evt.pointerId !== this.pendingTouch.pointerId
      ) {
        if (this.activeProfile.touchGuard.cancelOnSecondTouch) {
          this.cancelPendingTouch();
        }
        return;
      }

      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      if (this.isSpacePressed) {
        return;
      }

      if (e?.evt?.button !== 0) {
        return;
      }

      if (e.evt.pointerType === 'touch' && this.penActive) return;

      if (e.evt.pointerType === 'pen') {
        this.penActive = true;
        this.penSeen = true;
      }

      // The profile is resolved once, here, and kept for the whole stroke.
      this.setActiveProfile(
        resolveBrushInputProfileKey(
          {
            pointerType: e.evt.pointerType,
            platform: detectBrushPlatform(),
            persistentDeviceId: (e.evt as { persistentDeviceId?: number })
              .persistentDeviceId,
          },
          this.config.input
        )
      );

      const guard = this.activeProfile.touchGuard;
      if (
        e.evt.pointerType === 'touch' &&
        guard.ignoreAfterPen &&
        this.penSeen
      ) {
        return;
      }

      // Reset smoothing state BEFORE computing the new stroke's first
      // pressure sample, so it can never inherit the previous stroke's
      // ending pressure/pointer position (see resetPressureSmoothingState).
      this.resetPressureSmoothingState();

      const pointPressure = this.getEventPressure(e);
      this.strokePointerId =
        typeof e.evt.pointerId === 'number' ? e.evt.pointerId : null;

      // A finger stroke waits until it is clear it is not the start of a
      // gesture.
      if (
        e.evt.pointerType === 'touch' &&
        (guard.waitMs > 0 || guard.movePx > 0)
      ) {
        this.startPendingTouch(e, pointPressure);
        e.evt.stopPropagation();
        return;
      }

      this.handleStartStroke(pointPressure, e.evt.timeStamp);
      this.captureState.lastClient = { x: e.evt.clientX, y: e.evt.clientY };

      e.evt.stopPropagation();
    };

    stage.on('pointerdown', handlePointerDown);

    const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state === BRUSH_TOOL_STATE.INACTIVE) return;

      this.setCursor();

      if (this.pendingTouch && this.state === BRUSH_TOOL_STATE.IDLE) {
        this.handlePendingTouchMove(e);
        return;
      }

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      this.handleMoveEvent(e);
      e.evt.stopPropagation();
    };

    stage.on('pointermove', handlePointerMove);

    const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
      this.penActive = false;

      // The finger lifted before its stroke was committed: it was a tap.
      if (this.pendingTouch && this.state === BRUSH_TOOL_STATE.IDLE) {
        if (e.evt.pointerId !== this.pendingTouch.pointerId) {
          return;
        }
        this.commitPendingTouch();
      }

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      // Another finger lifting, for instance the second finger of a pinch, does
      // not end a stroke it did not draw.
      if (
        this.strokePointerId !== null &&
        typeof e.evt.pointerId === 'number' &&
        e.evt.pointerId !== this.strokePointerId
      ) {
        return;
      }

      // The stroke ends when the pointer that drew it lifts, also during a
      // pinch: ignoring it left the tool stuck in the drawing state.
      this.handleEndStroke();
      this.strokePointerId = null;

      e.evt.stopPropagation();
    };

    stage.on('pointerup', handlePointerUp);

    this.initialized = true;
  }

  private setState(state: WeaveBrushToolActionState) {
    this.state = state;
  }

  private getBoundingBox(strokeElements: WeaveStrokePoint[]) {
    if (strokeElements.length === 0) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }

    let minX = strokeElements[0].x;
    let maxX = strokeElements[0].x;
    let minY = strokeElements[0].y;
    let maxY = strokeElements[0].y;

    strokeElements.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /** Puts a finger stroke on hold until it is clear it is not a gesture. */
  private startPendingTouch(
    e: Konva.KonvaEventObject<PointerEvent>,
    pressure: number
  ): void {
    const guard = this.activeProfile.touchGuard;
    const pending: PendingTouch = {
      pointerId: e.evt.pointerId,
      startClient: { x: e.evt.clientX, y: e.evt.clientY },
      pressure,
      time: e.evt.timeStamp,
      start: this.instance.getMousePointer(),
      samples: [],
      timer: null,
    };
    if (guard.waitMs > 0) {
      pending.timer = setTimeout(() => this.commitPendingTouch(), guard.waitMs);
    }
    this.pendingTouch = pending;
  }

  /** Drops a waiting finger stroke without leaving a mark. */
  private cancelPendingTouch(): void {
    if (this.pendingTouch?.timer) clearTimeout(this.pendingTouch.timer);
    this.pendingTouch = null;
    this.strokePointerId = null;
  }

  /**
   * Starts the stroke of a waiting finger at the point where it touched down,
   * then replays the moves that were held back, so the path is not lost.
   */
  private commitPendingTouch(): void {
    const pending = this.pendingTouch;
    if (!pending) return;
    if (pending.timer) clearTimeout(pending.timer);
    this.pendingTouch = null;

    if (this.state !== BRUSH_TOOL_STATE.IDLE) return;

    this.handleStartStroke(pending.pressure, pending.time, pending.start);
    this.captureState.lastClient = pending.startClient;

    // Without per-sample positions a replay would put every held move on the
    // current pointer position, so it only applies to coalesced capture.
    if (this.activeProfile.capture.source === 'coalesced') {
      for (const move of pending.samples) {
        this.handleMoveEvent({
          evt: {
            pointerId: move.pointerId,
            pointerType: move.pointerType,
            clientX: move.clientX,
            clientY: move.clientY,
            pressure: move.pressure,
            timeStamp: move.timeStamp,
            getCoalescedEvents: () => move.coalesced,
            getPredictedEvents: () => [],
            stopPropagation: () => undefined,
          },
        } as unknown as Konva.KonvaEventObject<PointerEvent>);
      }
    }
  }

  /** Holds a move of the waiting finger, and commits once it has moved enough. */
  private handlePendingTouchMove(
    e: Konva.KonvaEventObject<PointerEvent>
  ): void {
    const pending = this.pendingTouch;
    if (!pending || e.evt.pointerId !== pending.pointerId) return;

    const guard = this.activeProfile.touchGuard;

    if (this.getZoomPlugin()?.isPinching()) {
      if (guard.cancelOnSecondTouch) this.cancelPendingTouch();
      return;
    }

    const batch = e.evt.getCoalescedEvents ? e.evt.getCoalescedEvents() : [];
    const source = batch.length > 0 ? batch : [e.evt];
    pending.samples.push({
      pointerId: e.evt.pointerId,
      pointerType: e.evt.pointerType,
      clientX: e.evt.clientX,
      clientY: e.evt.clientY,
      pressure: e.evt.pressure,
      timeStamp: e.evt.timeStamp,
      coalesced: source.map((c) => ({
        pointerType: c.pointerType,
        pressure: c.pressure,
        clientX: c.clientX,
        clientY: c.clientY,
        timeStamp: c.timeStamp,
      })),
    });

    if (
      guard.movePx > 0 &&
      Math.hypot(
        e.evt.clientX - pending.startClient.x,
        e.evt.clientY - pending.startClient.y
      ) >= guard.movePx
    ) {
      this.commitPendingTouch();
    }

    e.evt.stopPropagation();
  }

  private handleStartStroke(
    pressure: number,
    time?: number,
    start?: MousePointInfo
  ) {
    this.resetPressureSmoothingState();

    const { mousePoint, container, measureContainer } =
      start ?? this.instance.getMousePointer();

    // The stabilizer continues from the pointer-down position. Time and zoom
    // are read lazily, so a profile without a stabilizer costs nothing.
    if (mousePoint) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.stabilizer.seed(mousePoint, {
        get now() {
          return self.sampleTime(time);
        },
        get zoom() {
          return self.instance.getStage().scaleX();
        },
      });
      this.lastRawPoint = { x: mousePoint.x, y: mousePoint.y };
    }

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.strokeId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

    if (nodeHandler && mousePoint && this.measureContainer) {
      const newStrokeElements = [];
      newStrokeElements.push({
        x: mousePoint.x,
        y: mousePoint.y,
        pressure,
      });

      const inputMeta = this.getInputMeta();

      const node = nodeHandler.create(this.strokeId, {
        ...this.props,
        ...(this.look ? { look: this.look } : {}),
        ...(inputMeta ? { inputMeta } : {}),
        isEraser: this.isEraser,
        strokeScaleEnabled: true,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        strokeElements: newStrokeElements,
      });
      const nodeInstance = nodeHandler.onRender(node.props);
      this.measureContainer?.add(nodeInstance);
    }

    this.getTraceSink()?.onStrokeStart({
      profile: this.activeProfileKey,
      preset: this.presetIds[this.activeProfileKey],
      ...(this.scenarioId ? { scenario: this.scenarioId } : {}),
      profileConfig: this.activeProfile,
      strokeWidth: this.props.strokeWidth ?? 1,
      zoom: this.instance.getStage().scaleX(),
    });

    this.setState(BRUSH_TOOL_STATE.DEFINE_STROKE);
  }

  /**
   * Appends one or more pointer samples to the stroke in a single
   * read-modify-write, then renders once.
   *
   * Batching matters: a stylus reports a burst of coalesced samples per
   * frame, and applying them one at a time meant copying the whole point
   * array, recomputing the whole bounding box and issuing a full redraw
   * once PER SAMPLE. That is O(n) work repeated ~10x a frame, i.e.
   * quadratic in stroke length - which is why drawing fast could stall for
   * seconds. Here that O(n) work happens once per event instead.
   */
  private applyMovementSamples(samples: CapturedSample[]): void {
    if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
      return;
    }

    if (samples.length === 0) {
      return;
    }

    const stage = this.instance.getStage();

    const tempStroke = stage.findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (!this.measureContainer || !tempStroke) {
      return;
    }

    const sink = this.getTraceSink();
    const batchStart = sink ? performance.now() : 0;

    let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

    // A stabilizer keeps a state that follows the pen. A predicted sample is a
    // guess that is dropped on the next real one, but would still move that
    // state, bending the real line after it. With a stabilizer they are skipped.
    const skipPredicted = this.activeProfile.stabilizer.type !== 'none';

    for (const sample of samples) {
      if (sample.isPredicted && skipPredicted) continue;

      // Each sample carries its own position: without this every sample in
      // a coalesced burst would read the same (last dispatched) pointer
      // position and append duplicate points.
      if (sample.sourceEvent) {
        stage.setPointersPositions(sample.sourceEvent);
      }

      // A captured sample already carries its own position; otherwise it is
      // the stage's current pointer position.
      const mousePoint =
        sample.point ??
        this.instance.getMousePointerRelativeToContainer(this.measureContainer)
          .mousePoint;

      // The stabilizer reads time and zoom lazily, so a profile without one
      // costs nothing per sample.
      if (!sample.isPredicted) {
        this.lastRawPoint = { x: mousePoint.x, y: mousePoint.y };
      }

      const sampleTime = (): number => this.sampleTime(sample.time);
      const stabilized = this.stabilizer.apply(mousePoint, {
        get now() {
          return sampleTime();
        },
        get zoom() {
          return stage.scaleX();
        },
      });

      sink?.onSample({
        raw: { x: mousePoint.x, y: mousePoint.y },
        stabilized: { x: stabilized.x, y: stabilized.y },
        pressure: sample.pressure,
        time: sampleTime(),
        predicted: sample.isPredicted,
      });

      const currentPoint: WeaveStrokePoint = {
        x: stabilized.x - tempStroke.x(),
        y: stabilized.y - tempStroke.y(),
        pressure: sample.pressure,
      };

      if (!sample.isPredicted && this.predictedCount > 0) {
        newStrokeElements = newStrokeElements.slice(
          0,
          -1 * this.predictedCount
        );
        this.predictedCount = 0;
      }

      applyStartPolicy(
        newStrokeElements,
        currentPoint,
        sample.isPredicted,
        this.activeProfile.pressure
      );

      newStrokeElements.push(currentPoint);

      if (sample.isPredicted) {
        this.predictedCount++;
      }
    }

    const box = this.getBoundingBox(newStrokeElements);

    tempStroke.setAttrs({
      width: box.width,
      height: box.height,
      x: 0,
      y: 0,
      strokeElements: newStrokeElements,
    });

    const nodeHandler = this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

    if (nodeHandler) {
      nodeHandler.onUpdate(
        tempStroke as WeaveElementInstance,
        tempStroke.getAttrs()
      );
    }

    sink?.onBatch({
      ms: performance.now() - batchStart,
      samples: samples.length,
    });
  }

  private handleMovement(
    pressure: number,
    predictedEvent?: PointerEvent,
    isPredicted: boolean = false
  ) {
    this.applyMovementSamples([
      { pressure, sourceEvent: predictedEvent, isPredicted },
    ]);
  }

  /**
   * The point that completes a stabilized stroke at the pen's last position,
   * or `null` when the stroke already ends there or has no stabilizer.
   */
  private getStrokeCompletion(
    elements: WeaveStrokePoint[],
    tempStroke: Konva.Line
  ): WeaveStrokePoint | null {
    const cfg = this.activeProfile.stabilizer;
    if (cfg.type === 'none' || !cfg.catchUpOnEnd) return null;
    if (!this.lastRawPoint || elements.length === 0) return null;

    const last = elements[elements.length - 1];
    const x = this.lastRawPoint.x - tempStroke.x();
    const y = this.lastRawPoint.y - tempStroke.y();
    if (x === last.x && y === last.y) return null;

    return { x, y, pressure: last.pressure };
  }

  private finalizeStroke(
    tempStroke: Konva.Line,
    nodeHandler: WeaveStrokeNode
  ): void {
    let box = this.getBoundingBox(tempStroke.getAttrs().strokeElements);

    let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

    if (this.predictedCount > 0) {
      newStrokeElements = newStrokeElements.slice(
        0,
        -1 * this.predictedCount
      );
      this.predictedCount = 0;
    }

    // A stabilized stroke lags behind the pen: complete it where the pen was
    // lifted.
    const completion = this.getStrokeCompletion(newStrokeElements, tempStroke);
    if (completion) {
      newStrokeElements = [...newStrokeElements, completion];
      box = this.getBoundingBox([
        ...tempStroke.getAttrs().strokeElements,
        completion,
      ]);
    }

    // Runs after predicted-point trimming above, so it never backfills
    // from/into a still-speculative point.
    newStrokeElements = applyEndPolicy(
      newStrokeElements,
      this.activeProfile.pressure
    );

    newStrokeElements = newStrokeElements.map((point) => ({
      ...point,
      x: point.x - box.x,
      y: point.y - box.y,
    }));

    // The zoom is only needed when the tolerance or the fit is in screen pixels.
    const finalize = this.activeProfile.finalize;
    const zoom =
      finalize.toleranceUnit === 'screen' ||
      finalize.mode === 'bezierFit' ||
      finalize.mode === 'dpPressure'
        ? this.instance.getStage().scaleX()
        : 1;

    const finalizeStart = performance.now();
    const compressedPoints = finalizePoints(
      newStrokeElements,
      finalize,
      this.config.simplifyTolerance,
      zoom
    );

    this.getTraceSink()?.onStrokeEnd({
      beforeFinalize: newStrokeElements.map((p) => ({
        x: p.x + box.x,
        y: p.y + box.y,
        pressure: p.pressure,
      })),
      finalPoints: compressedPoints.map((p) => ({
        x: p.x + box.x,
        y: p.y + box.y,
        pressure: p.pressure,
      })),
      strokeWidth: tempStroke.getAttrs().strokeWidth ?? 1,
      finalizeMs: performance.now() - finalizeStart,
    });

    const sw = tempStroke.getAttrs().strokeWidth ?? 1;
    const finalWidth = Math.max(box.width, sw);
    const finalHeight = Math.max(box.height, sw);
    const finalX = box.width === 0 ? box.x - sw / 2 : box.x;
    const finalY = box.height === 0 ? box.y - sw / 2 : box.y;

    tempStroke.setAttrs({
      width: finalWidth,
      height: finalHeight,
      x: finalX,
      y: finalY,
      strokeElements: compressedPoints,
    });

    const strokeNodeId: string = tempStroke.getAttrs().id ?? '';
    const serializedNode = nodeHandler.serialize(
      tempStroke as WeaveElementInstance
    );
    const hasPoints = tempStroke.getAttrs().strokeElements.length >= 1;

    const preview = this.instance.getStage().findOne(`#${strokeNodeId}`);

    if (!hasPoints) {
      preview?.destroy();
      return;
    }

    // Hand the stroke over to persisted state WITHOUT leaving a gap on
    // screen. `addNode` writes to the shared document; the persisted node is
    // only drawn once the (host-supplied, asynchronous) renderer reacts to
    // that write. Destroying the preview first therefore left one or more
    // frames with nothing painted - visible as a blink the moment a stroke
    // was finished. Instead the preview stays up until the real node is
    // actually on the stage.
    //
    // The preview is re-keyed first so it cannot collide with the incoming
    // node's id while both briefly exist: `findOne` matches by id, and a
    // duplicate would make lookups (including the selection made in
    // `cleanup`) ambiguous.
    if (preview) {
      preview.setAttrs({ id: `${strokeNodeId}${PREVIEW_ID_SUFFIX}` });
    }

    this.instance.addNode(serializedNode, this.container?.getAttrs().id);

    this.removePreviewWhenRendered(preview, strokeNodeId);
  }

  /**
   * Destroys the finished stroke's preview node once its persisted
   * counterpart has actually been rendered onto the stage, so the stroke is
   * never absent from the canvas between the two.
   *
   * Falls back to destroying immediately where no frame scheduler exists
   * (non-browser hosts), and gives up waiting after a bounded number of
   * frames so a preview can never be orphaned if the node never arrives.
   */
  private removePreviewWhenRendered(
    preview: Konva.Node | undefined,
    realNodeId: string
  ): void {
    if (!preview) return;

    const scheduleFrame =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : undefined;

    if (!scheduleFrame) {
      preview.destroy();
      return;
    }

    let framesWaited = 0;

    const check = () => {
      const rendered = this.instance.getStage().findOne(`#${realNodeId}`);

      if (rendered || framesWaited >= PREVIEW_HANDOVER_MAX_FRAMES) {
        preview.destroy();
        return;
      }

      framesWaited++;
      scheduleFrame(check);
    };

    check();
  }

  private handleEndStroke() {
    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (tempStroke) {
      const nodeHandler =
        this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

      if (nodeHandler) {
        this.finalizeStroke(tempStroke, nodeHandler);
      }

      this.clickPoint = null;

      this.setCursor();
      this.setFocusStage();

      this.setState(BRUSH_TOOL_STATE.IDLE);
    }
  }

  trigger(cancel: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancel;

    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    this.cancelPendingTouch();
    this.penSeen = false;
    this.props = this.initProps();
    this.setState(BRUSH_TOOL_STATE.IDLE);

    this.instance.emitEvent<WeaveBrushToolActionOnAddingEvent>('onAddingBrush');

    this.setCursor();
    this.setFocusStage();
  }

  onEraserMode(): boolean {
    return this.isEraser;
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.touchAction = this.prevTouchAction;
    stage.container().style.cursor = 'default';

    this.instance.emitEvent<WeaveBrushToolActionOnAddedEvent>('onAddedBrush');

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.strokeId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.cancelPendingTouch();
    this.clickPoint = null;
    this.setState(BRUSH_TOOL_STATE.INACTIVE);
  }

  getZoomPlugin() {
    const zoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
    return zoomPlugin;
  }

  private setCursor() {
    const stage = this.instance.getStage();

    if (this.isSpacePressed) {
      return;
    }

    stage.container().style.cursor = 'crosshair';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }
}
