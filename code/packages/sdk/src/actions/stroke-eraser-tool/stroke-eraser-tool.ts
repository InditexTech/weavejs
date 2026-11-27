// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { v4 as uuidv4 } from 'uuid';
import type {
  WeaveElementInstance,
  WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { PREVIEW_ID_SUFFIX } from '../brush-tool/constants';
import type { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import { WEAVE_STROKE_NODE_TYPE } from '@/nodes/stroke/constants';
import type { WeaveEraserCapsule } from '@/nodes/stroke/render/erase';
import type { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import {
  STROKE_ERASER_CURSOR_STYLE,
  STROKE_ERASER_DEFAULT_FINALIZE,
  STROKE_ERASER_DEFAULT_PROPS,
  STROKE_ERASER_MUTEX_OPERATION,
  STROKE_ERASER_REFINE_BUDGET_MS,
  STROKE_ERASER_TOOL_ACTION_NAME,
  STROKE_ERASER_TOOL_STATE,
} from './constants';
import { eraserRadiusInCanvas, toNodeSpaceCapsule } from './local-space';
import { buildStrokePieces } from './pieces';
import type {
  WeaveStrokeEraserToolActionState,
  WeaveStrokeEraserToolParams,
  WeaveStrokeEraserToolProps,
} from './types';
import type { WeaveBrushFinalizeConfig } from '../brush-tool/types';

type XY = { x: number; y: number };

/** A stroke the current gesture can erase, and what has been erased of it so far. */
type EraseTarget = {
  node: Konva.Node;
  /** Bounds of the node in the space of the main layer, with room for the stroke width. */
  bounds: { x1: number; y1: number; x2: number; y2: number };
  mask: WeaveEraserCapsule[];
};

/** Frames a preview may wait for its node to take the committed stroke, at most. */
const HANDOVER_MAX_FRAMES = 30;

export class WeaveStrokeEraserToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state!: WeaveStrokeEraserToolActionState;
  protected erasing: boolean = false;
  protected cancelAction!: () => void;
  protected cursor: Konva.Group | null = null;
  protected lastPoint: XY | null = null;
  protected targets: Map<string, EraseTarget> = new Map();
  /** The pointer that is erasing: another one lifting or moving is not it. */
  protected pointerId: number | null = null;
  /** Strokes whose committed erase the host has not taken yet. */
  private readonly pendingHandover = new Set<Konva.Node>();
  private prevTouchAction: string | null = null;
  private readonly defaultProps: WeaveStrokeEraserToolProps;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveStrokeEraserToolParams) {
    super();

    this.defaultProps = {
      ...STROKE_ERASER_DEFAULT_PROPS,
      ...params?.config,
      finalize: {
        ...STROKE_ERASER_DEFAULT_FINALIZE,
        ...params?.config?.finalize,
      },
    };

    this.initialize();
  }

  initialize(): void {
    this.initialized = false;
    this.erasing = false;
    this.state = STROKE_ERASER_TOOL_STATE.IDLE;
    this.props = { ...this.defaultProps };
  }

  getName(): string {
    return STROKE_ERASER_TOOL_ACTION_NAME;
  }

  private getSettings(): WeaveStrokeEraserToolProps {
    const props = this.props as Partial<WeaveStrokeEraserToolProps>;
    return {
      size: props.size ?? this.defaultProps.size,
      minPieceLengthPx:
        props.minPieceLengthPx ?? this.defaultProps.minPieceLengthPx,
      finalize: { ...this.defaultProps.finalize, ...props.finalize },
    };
  }

  private setState(state: WeaveStrokeEraserToolActionState) {
    this.state = state;
  }

  private isActive(): boolean {
    return (
      this.state !== STROKE_ERASER_TOOL_STATE.IDLE &&
      this.instance.getActiveAction() === STROKE_ERASER_TOOL_ACTION_NAME
    );
  }

  private isPinching(): boolean {
    return (
      this.instance
        .getPlugin<WeaveStageZoomPlugin>('stageZoom')
        ?.isPinching() ?? false
    );
  }

  /** Whether an event is of the pointer that is erasing, or of any when none is known. */
  private isOwnPointer(evt: { pointerId?: number }): boolean {
    return (
      this.pointerId === null ||
      typeof evt.pointerId !== 'number' ||
      evt.pointerId === this.pointerId
    );
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.on(
      'pointerdown',
      (e: KonvaEventObject<PointerEvent, Konva.Stage>) => {
        if (!this.isActive()) return;
        if (e.evt.pointerType === 'mouse' && e.evt.button !== 0) return;
        if (this.isPinching()) return;
        this.pointerId =
          typeof e.evt.pointerId === 'number' ? e.evt.pointerId : null;
        this.startGesture();
      }
    );

    stage.on(
      'pointermove',
      (e: KonvaEventObject<PointerEvent, Konva.Stage>) => {
        if (!this.isActive()) return;
        this.moveCursor();
        if (!this.erasing || !this.isOwnPointer(e.evt)) return;

        // a second finger turns the gesture into a pinch: the erase is dropped
        if (this.isPinching()) {
          this.discardGesture();
          return;
        }
        this.sample();
      }
    );

    const finish = (evt: { pointerId?: number }) => {
      if (this.erasing && this.isOwnPointer(evt)) void this.commitGesture();
    };
    stage.on('pointerup', (e: KonvaEventObject<PointerEvent, Konva.Stage>) =>
      finish(e.evt)
    );
    // a release outside the canvas never reaches the stage
    window.addEventListener('pointerup', (e) => finish(e), {
      signal: this.instance.getEventsController().signal,
    });
    window.addEventListener(
      'pointercancel',
      (e) => {
        if (this.isOwnPointer(e)) this.discardGesture();
      },
      { signal: this.instance.getEventsController().signal }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.code === 'Escape' &&
          this.instance.getActiveAction() === STROKE_ERASER_TOOL_ACTION_NAME
        ) {
          if (this.erasing) {
            this.discardGesture();
            return;
          }
          this.cancelAction();
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    this.initialized = true;
  }

  // ---- gesture -----------------------------------------------------------

  private getLayerPoint(): XY | null {
    return this.instance.getMainLayer()?.getRelativePointerPosition() ?? null;
  }

  private strokeHandler(): WeaveStrokeNode | undefined {
    return this.instance.getNodeHandler<WeaveStrokeNode>(
      WEAVE_STROKE_NODE_TYPE
    );
  }

  /** Whether the current user may change the node: not locked, not held by someone else. */
  private canErase(node: Konva.Node): boolean {
    const attrs = node.getAttrs();
    if (attrs.locked) return false;
    if (this.instance.allNodesLocked([node])) return false;
    if (
      attrs.mutexLocked &&
      attrs.mutexUserId !== this.instance.getStore().getUser().id
    ) {
      return false;
    }
    return true;
  }

  /** The strokes that can be erased now, with their bounds in main layer space. */
  private collectTargets(): void {
    const layer = this.instance.getMainLayer();
    const stage = this.instance.getStage();
    this.targets.clear();
    if (!layer) return;

    const nodes = stage.find((n: Konva.Node) => {
      const attrs = n.getAttrs();
      return (
        attrs.nodeType === WEAVE_STROKE_NODE_TYPE &&
        typeof attrs.id === 'string' &&
        !attrs.id.endsWith(PREVIEW_ID_SUFFIX)
      );
    });

    for (const node of nodes) {
      if (!node.isVisible() || !this.canErase(node)) continue;
      // its points are about to change: a mask now would be for the old ones
      if (this.pendingHandover.has(node)) continue;
      const rect = node.getClientRect({ relativeTo: layer });
      const room = (node.getAttrs().strokeWidth ?? 1) * 2;
      this.targets.set(node.getAttrs().id as string, {
        node,
        bounds: {
          x1: rect.x - room,
          y1: rect.y - room,
          x2: rect.x + rect.width + room,
          y2: rect.y + rect.height + room,
        },
        mask: [],
      });
    }
  }

  private startGesture(): void {
    const point = this.getLayerPoint();
    if (!point) return;

    this.collectTargets();
    this.erasing = true;
    this.lastPoint = point;
    this.setState(STROKE_ERASER_TOOL_STATE.ERASING);
    this.sample();
  }

  /** Adds the eraser's step since the last sample to every stroke it can reach. */
  private sample(): void {
    const layer = this.instance.getMainLayer();
    const point = this.getLayerPoint();
    const handler = this.strokeHandler();
    if (!layer || !point || !handler) return;

    const from = this.lastPoint ?? point;
    const zoom = this.instance.getStage().scaleX();
    const radius = eraserRadiusInCanvas(this.getSettings().size / 2, zoom);
    this.lastPoint = point;

    const x1 = Math.min(from.x, point.x) - radius;
    const x2 = Math.max(from.x, point.x) + radius;
    const y1 = Math.min(from.y, point.y) - radius;
    const y2 = Math.max(from.y, point.y) + radius;

    for (const target of this.targets.values()) {
      const b = target.bounds;
      if (x2 < b.x1 || x1 > b.x2 || y2 < b.y1 || y1 > b.y2) continue;

      target.mask.push(
        toNodeSpaceCapsule(target.node, layer, from, point, radius)
      );
      handler.setEraseMask(target.node, target.mask.slice());
    }
  }

  private clearMasks(): void {
    const handler = this.strokeHandler();
    for (const target of this.targets.values()) {
      if (target.mask.length > 0) handler?.setEraseMask(target.node, null);
    }
    this.targets.clear();
  }

  private discardGesture(): void {
    if (!this.erasing) return;
    this.erasing = false;
    this.lastPoint = null;
    this.pointerId = null;
    this.clearMasks();
    this.setState(STROKE_ERASER_TOOL_STATE.ERASING);
  }

  // ---- commit ------------------------------------------------------------

  /**
   * What each erased stroke becomes: its surviving pieces, kept within a bound
   * of the line they were cut from, or nothing when none survives.
   */
  private planChanges(targets: EraseTarget[], handler: WeaveStrokeNode) {
    const settings = this.getSettings();
    const finalize = settings.finalize as WeaveBrushFinalizeConfig;
    const deadline = performance.now() + STROKE_ERASER_REFINE_BUDGET_MS;

    const changes: {
      target: EraseTarget;
      pieces: ReturnType<typeof buildStrokePieces>;
    }[] = [];

    for (const target of targets) {
      if (target.mask.length === 0 || !this.canErase(target.node)) continue;

      const cut = handler.cutStrokeWithMask(target.node, target.mask);
      if (!cut?.erased) continue;

      // points are in the space of the node: one screen pixel is this much of it
      const scale = target.node.getAbsoluteScale().x;
      const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const attrs = target.node.getAttrs();

      changes.push({
        target,
        pieces: buildStrokePieces({
          runs: cut.runs,
          strokeWidth: attrs.strokeWidth ?? 1,
          look: attrs.look,
          finalize,
          zoom,
          minLength: eraserRadiusInCanvas(settings.minPieceLengthPx, zoom),
          geometryOf: (look, points) =>
            handler.getRenderedGeometry(target.node, {
              points,
              look: look ?? null,
            }),
          deadline,
        }),
      });
    }

    return changes;
  }

  /**
   * Writes the gesture to the document in one transaction, under a mutex lock
   * on the strokes it changes: the first piece of each stroke updates it, the
   * others are inserted after it, and a stroke nothing survives is removed.
   * If anything fails the previews are taken off and nothing is left locked.
   */
  private async commitGesture(): Promise<void> {
    this.erasing = false;
    this.lastPoint = null;
    this.pointerId = null;

    const all = [...this.targets.values()];
    this.targets.clear();

    const handler = this.strokeHandler();
    if (!handler) return;

    const stops: (() => void)[] = [];
    try {
      const changes = this.planChanges(all, handler);

      // a preview that is not written has nothing to wait for
      const written = new Set(changes.map((c) => c.target));
      for (const target of all) {
        if (!written.has(target) && target.mask.length > 0) {
          handler.setEraseMask(target.node, null);
        }
      }
      if (changes.length === 0) return;

      // Armed before the write: the host may render it at once, and a mask
      // kept past that would be applied to the piece in the space of the box
      // it had before.
      for (const change of changes) {
        stops.push(this.releaseMaskWhenUpdated(change.target));
      }

      let done = false;
      let failure: unknown;
      await this.instance.acquireMutexLock(
        {
          nodeIds: changes.map((c) => c.target.node.getAttrs().id as string),
          operation: STROKE_ERASER_MUTEX_OPERATION,
        },
        // caught here so the lock is released whatever happens
        () => {
          try {
            this.instance.stateTransactional(() => {
              for (const change of changes) this.writeChange(change);
            });
            done = true;
          } catch (error) {
            failure = error;
          }
        }
      );

      if (failure) throw failure;

      if (!done) {
        for (const stop of stops) stop();
        for (const { target } of changes) {
          handler.setEraseMask(target.node, null);
        }
      }
    } catch (error) {
      this.getLogger()?.error({ error }, 'The stroke eraser could not write');
      for (const stop of stops) stop();
      for (const target of all) handler.setEraseMask(target.node, null);
    }
  }

  private writeChange({
    target,
    pieces,
  }: {
    target: EraseTarget;
    pieces: ReturnType<typeof buildStrokePieces>;
  }): void {
    const handler = this.strokeHandler();
    if (!handler) return;

    const node = target.node;
    const serialized = handler.serialize(node as WeaveElementInstance);
    const id = serialized.key;

    if (pieces.length === 0) {
      this.instance.removeNodeNT(serialized);
      return;
    }

    const { parent, index } = this.instance.getNode(id);
    const parentId = parent?.key ?? 'mainLayer';
    const offset = { x: node.offsetX() ?? 0, y: node.offsetY() ?? 0 };
    const toParent = node.getTransform();

    pieces.forEach((piece, i) => {
      // where the corner of the piece's box falls, so the piece does not move
      const origin = toParent.point({
        x: piece.box.x + offset.x,
        y: piece.box.y + offset.y,
      });
      const key = i === 0 ? id : uuidv4();
      const element: WeaveStateElement = {
        ...serialized,
        key,
        props: {
          ...serialized.props,
          id: key,
          x: origin.x,
          y: origin.y,
          width: piece.box.width,
          height: piece.box.height,
          strokeElements: piece.points,
          ...(piece.look === undefined ? {} : { look: piece.look }),
        },
      };

      if (i === 0) {
        this.instance.updateNodeNT(element);
      } else {
        this.instance.addNodeNT(element, parentId, { index: index + i });
      }
    });
  }

  /**
   * Keeps the preview of a stroke on screen until the node has taken the
   * committed stroke, so there is no frame in which the whole stroke shows
   * again: the host renders the written state asynchronously. Returns a
   * function that stops waiting.
   */
  private releaseMaskWhenUpdated(target: EraseTarget): () => void {
    const handler = this.strokeHandler();
    const node = target.node;
    let finished = false;
    this.pendingHandover.add(node);

    const stop = () => {
      finished = true;
      this.pendingHandover.delete(node);
      node.off('strokeElementsChange.strokeEraser');
    };
    const release = () => {
      if (finished) return;
      stop();
      handler?.setEraseMask(node, null);
    };

    node.on('strokeElementsChange.strokeEraser', release);

    let frames = 0;
    const wait = () => {
      if (finished) return;
      if (++frames >= HANDOVER_MAX_FRAMES) {
        release();
        return;
      }
      requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);

    return stop;
  }

  // ---- cursor and lifecycle ---------------------------------------------

  private buildCursor(): void {
    this.removeCursor();

    const stage = this.instance.getStage();
    const radius = this.getSettings().size / 2;
    const pos = stage.getRelativePointerPosition() ?? { x: 0, y: 0 };

    this.cursor = new Konva.Group({
      x: pos.x,
      y: pos.y,
      scale: { x: 1 / stage.scaleX(), y: 1 / stage.scaleY() },
      listening: false,
      draggable: false,
    });
    this.cursor.add(
      new Konva.Circle({
        radius: radius + 1,
        stroke: STROKE_ERASER_CURSOR_STYLE.outer,
        strokeWidth: 1,
        listening: false,
      })
    );
    this.cursor.add(
      new Konva.Circle({
        radius,
        stroke: STROKE_ERASER_CURSOR_STYLE.inner,
        strokeWidth: 1,
        listening: false,
      })
    );

    this.instance.getUtilityLayer()?.add(this.cursor);
  }

  private moveCursor(): void {
    if (!this.cursor) return;
    const stage = this.instance.getStage();
    const pos = stage.getRelativePointerPosition();
    if (pos) this.cursor.position(pos);
    this.cursor.scale({ x: 1 / stage.scaleX(), y: 1 / stage.scaleY() });
    this.cursor.moveToTop();
  }

  private removeCursor(): void {
    this.cursor?.destroy();
    this.cursor = null;
  }

  trigger(cancelAction: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.instance.getUtilityLayer()) {
      console.warn(
        'Utility layer not found. Stroke Eraser Tool requires a utility layer to work properly.'
      );
      cancelAction();
      return;
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
      selectionPlugin.disable();
    }

    // a finger or a pen that drags would otherwise scroll or zoom the page,
    // and the browser would cancel the pointer
    if (this.prevTouchAction === null) {
      this.prevTouchAction = stage.container().style.touchAction;
    }
    stage.container().style.touchAction = 'none';

    this.buildCursor();
    stage.container().style.cursor = 'none';
    this.setState(STROKE_ERASER_TOOL_STATE.ERASING);
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.erasing = false;
    this.lastPoint = null;
    this.pointerId = null;
    this.clearMasks();
    this.removeCursor();
    stage.container().style.cursor = 'default';
    if (this.prevTouchAction !== null) {
      stage.container().style.touchAction = this.prevTouchAction;
      this.prevTouchAction = null;
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.enable();
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.setState(STROKE_ERASER_TOOL_STATE.IDLE);
  }
}
