// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import simplify from 'simplify-js';
import { v4 as uuidv4 } from 'uuid';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
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
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveBrushToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      BRUSH_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );

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
   * Velocity-adaptive exponential smoothing of a single raw pressure sample.
   *
   * This is the one place pressure smoothing happens. Every sample that
   * becomes a stroke point must go through it - including the
   * high-frequency coalesced samples a stylus reports (see
   * `handlePointerMove`), which previously bypassed it entirely and so
   * landed in the stroke with their raw value, no pressure floor, and
   * without advancing the smoothing state for later samples.
   *
   * Timing intentionally uses `performance.now()` (not the event's own
   * `timeStamp`), matching the original behaviour: the two are not
   * guaranteed to share a time origin, and mixing them corrupts the
   * velocity term that drives `alpha`.
   *
   * The first sample of a stroke SEEDS the filter with its own value
   * rather than being blended toward the neutral 0.5 baseline. Blending
   * from a constant gives every stroke a warm-up transient: the filter
   * starts at 0.5 and converges toward the pressure actually being
   * applied, so a stroke drawn lighter than 0.5 renders visibly fatter at
   * its start (and heavier than 0.5, thinner) until the filter catches
   * up. Seeding removes that transient entirely - smoothing then only
   * ever acts between real samples, which is its actual purpose.
   */
  private smoothPressureSample(
    raw: number,
    clientX: number,
    clientY: number
  ): number {
    const now = performance.now();
    let velocity = 0;

    // A sample without usable coordinates must not be allowed to produce a
    // NaN velocity: the EMA below is stateful, so a single NaN would poison
    // `lastSmoothedPressure` for the remainder of the stroke and render it
    // with NaN widths.
    const hasPosition = Number.isFinite(clientX) && Number.isFinite(clientY);

    if (hasPosition && this.lastPointerPos && now - this.lastPointerTime > 0) {
      const dx = clientX - this.lastPointerPos.x;
      const dy = clientY - this.lastPointerPos.y;
      velocity = (Math.hypot(dx, dy) / (now - this.lastPointerTime)) * 1000; // px/s
    }
    if (hasPosition) {
      this.lastPointerPos = { x: clientX, y: clientY };
    }
    this.lastPointerTime = now;

    const safeRaw = Number.isFinite(raw) ? raw : 0.5;

    if (!this.hasPressureSample) {
      this.hasPressureSample = true;
      this.lastSmoothedPressure = safeRaw;
      return Math.max(this.lastSmoothedPressure, 0.15);
    }

    // Fast movement → higher alpha (less smoothing, more responsive)
    // Slow movement → lower alpha (more smoothing, eliminates jitter)
    const alpha = Math.min(Math.max(velocity / 1500, 0.15), 0.6);

    const smoothed =
      alpha * safeRaw + (1 - alpha) * this.lastSmoothedPressure;
    this.lastSmoothedPressure = Number.isFinite(smoothed) ? smoothed : safeRaw;
    return Math.max(this.lastSmoothedPressure, 0.15); // floor prevents invisible strokes
  }

  /**
   * Raw pressure a pointer sample reports: the device's own reading for a
   * pen, a neutral constant for devices that do not sense pressure.
   */
  private getRawPressure(pointerType: string, pressure: unknown): number {
    if (pointerType === 'pen') {
      return (typeof pressure === 'number' ? pressure : 0) || 0.5;
    }
    return 0.5;
  }

  private getEventPressure(e: Konva.KonvaEventObject<PointerEvent>) {
    return this.smoothPressureSample(
      this.getRawPressure(e.evt.pointerType, e.evt.pressure),
      e.evt.clientX,
      e.evt.clientY
    );
  }

  /**
   * Resets the pressure-smoothing state (smoothed pressure, last known pointer
   * position/time, and predicted-point bookkeeping) to a neutral baseline.
   *
   * This state is scoped to a single stroke: it must be reset before the
   * first pressure sample of a new stroke is computed (in `handlePointerDown`,
   * ahead of the `getEventPressure` call for point 0), not only afterwards -
   * otherwise that first sample can inherit smoothing state left behind by
   * the previous stroke (its ending pressure, pointer position and time),
   * inflating the very first point's pressure.
   */
  private resetPressureSmoothingState() {
    this.lastSmoothedPressure = 0.5;
    this.hasPressureSample = false;
    this.lastPointerPos = null;
    this.lastPointerTime = 0;
    this.predictedCount = 0;
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

      if (e.evt.pointerType === 'pen') this.penActive = true;

      // Reset smoothing state BEFORE computing the new stroke's first
      // pressure sample, so it can never inherit the previous stroke's
      // ending pressure/pointer position (see resetPressureSmoothingState).
      this.resetPressureSmoothingState();

      const pointPressure = this.getEventPressure(e);
      this.handleStartStroke(pointPressure);

      e.evt.stopPropagation();
    };

    stage.on('pointerdown', handlePointerDown);

    const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state === BRUSH_TOOL_STATE.INACTIVE) return;

      this.setCursor();

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      const coalescedEvents = e.evt.getCoalescedEvents
        ? e.evt.getCoalescedEvents()
        : [];
      if (coalescedEvents.length > 1) {
        // Coalesced samples are the stylus's own high-frequency reports, so
        // a pen takes this branch on essentially every move. They must be
        // smoothed through the same path as any other sample: using their
        // raw pressure here let hardware spikes land in the stroke
        // verbatim (with no pressure floor) and left the smoothing state
        // stale for the rest of the stroke.
        const samples: {
          pressure: number;
          sourceEvent?: PointerEvent;
          isPredicted: boolean;
        }[] = coalescedEvents.map((ce) => ({
          pressure: this.smoothPressureSample(
            this.getRawPressure(ce.pointerType, ce.pressure),
            ce.clientX,
            ce.clientY
          ),
          // NOTE: deliberately no `sourceEvent` here. Repositioning the stage
          // per coalesced sample (via setPointersPositions) was tried and
          // broke stroke geometry, so coalesced samples keep using the
          // event's already-resolved pointer position, as before.
          isPredicted: false,
        }));

        const predictedEvents = e.evt.getPredictedEvents
          ? e.evt.getPredictedEvents()
          : [];
        if (predictedEvents.length > 0) {
          const last = predictedEvents[predictedEvents.length - 1];
          // Predicted samples are speculative and get rolled back, so they
          // must NOT advance the smoothing state that real samples depend
          // on - blend against it read-only instead of committing to it.
          const predPressure = Math.max(
            0.15 * this.getRawPressure(last.pointerType, last.pressure) +
              0.85 * this.lastSmoothedPressure,
            0.15
          );
          samples.push({
            pressure: predPressure,
            sourceEvent: last,
            isPredicted: true,
          });
        }

        // One read-modify-write and one redraw for the whole burst.
        this.applyMovementSamples(samples);
      } else {
        const pointPressure = this.getEventPressure(e);
        this.handleMovement(pointPressure, undefined, false);
      }
      e.evt.stopPropagation();
    };

    stage.on('pointermove', handlePointerMove);

    const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
      this.penActive = false;

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      this.handleEndStroke();

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

  private handleStartStroke(pressure: number) {
    this.resetPressureSmoothingState();

    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

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

      const node = nodeHandler.create(this.strokeId, {
        ...this.props,
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
  private applyMovementSamples(
    samples: {
      pressure: number;
      sourceEvent?: PointerEvent;
      isPredicted: boolean;
    }[]
  ): void {
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

    let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

    for (const sample of samples) {
      // Each sample carries its own position: without this every sample in
      // a coalesced burst would read the same (last dispatched) pointer
      // position and append duplicate points.
      if (sample.sourceEvent) {
        stage.setPointersPositions(sample.sourceEvent);
      }

      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const currentPoint: WeaveStrokePoint = {
        x: mousePoint.x - tempStroke.x(),
        y: mousePoint.y - tempStroke.y(),
        pressure: sample.pressure,
      };

      if (!sample.isPredicted && this.predictedCount > 0) {
        newStrokeElements = newStrokeElements.slice(
          0,
          -1 * this.predictedCount
        );
        this.predictedCount = 0;
      }

      // The stroke's very first (pointerdown) sample is frequently an
      // unreliable "contact spike" - many stylus/OS stacks report a
      // momentary peak pressure on initial touch that doesn't represent the
      // sustained drawing pressure. It's rendered standalone as a filled dot
      // and, via spline smoothing, doubly influences the start of the
      // rendered ribbon (see stroke.ts's getSplinePoints phantom endpoint).
      // Once a real second sample exists, trust it over that initial
      // contact reading for point 0 too, so neither artifact persists.
      // Only real (non-predicted) samples correct it, since predicted
      // points are speculative and may be rolled back.
      if (!sample.isPredicted && newStrokeElements.length === 1) {
        newStrokeElements[0] = {
          ...newStrokeElements[0],
          pressure: currentPoint.pressure,
        };
      }

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

  private finalizeStroke(
    tempStroke: Konva.Line,
    nodeHandler: WeaveStrokeNode
  ): void {
    const box = this.getBoundingBox(tempStroke.getAttrs().strokeElements);

    let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

    if (this.predictedCount > 0) {
      newStrokeElements = newStrokeElements.slice(
        0,
        -1 * this.predictedCount
      );
      this.predictedCount = 0;
    }

    // The stroke's very last (pointerup/lift-off) sample can be just as
    // unreliable as its first (pointerdown/contact) sample - many
    // stylus/OS pressure-sensing stacks report noisy or spiking values as
    // contact force ramps down toward zero, mirroring the well-known
    // "contact spike" at touch-down that handleMovement already corrects
    // for point 0. Nothing corrected this end of the stroke before, so an
    // unreliable lift-off reading could persist in the final rendered
    // ribbon - and be double-weighted by stroke.ts's spline endpoint
    // duplication - exactly like the already-fixed start-of-stroke case.
    // Trust the second-to-last (real, already-settled) sample over the
    // final sample's own pressure, mirroring the start-of-stroke backfill.
    // Runs after predicted-point trimming above, so it never backfills
    // from/into a still-speculative point.
    if (newStrokeElements.length >= 2) {
      const lastIndex = newStrokeElements.length - 1;
      newStrokeElements[lastIndex] = {
        ...newStrokeElements[lastIndex],
        pressure: newStrokeElements[lastIndex - 1].pressure,
      };
    }

    newStrokeElements = newStrokeElements.map((point) => ({
      ...point,
      x: point.x - box.x,
      y: point.y - box.y,
    }));

    const compressedPoints = simplify(
      newStrokeElements,
      this.config.simplifyTolerance,
      true
    );

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
