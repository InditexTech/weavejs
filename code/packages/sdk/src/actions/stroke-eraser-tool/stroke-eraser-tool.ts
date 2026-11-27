// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { PREVIEW_ID_SUFFIX } from '../brush-tool/constants';
import type { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import { WEAVE_STROKE_NODE_TYPE } from '@/nodes/stroke/constants';
import {
  compactErasure,
  holesOfAll,
  readErasures,
  touchesInk,
  type WeaveStrokeErasure,
} from '@/nodes/stroke/render/erasure';
import type { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import {
  STROKE_ERASER_CURSOR_STYLE,
  STROKE_ERASER_DEFAULT_PROPS,
  STROKE_ERASER_MUTEX_OPERATION,
  STROKE_ERASER_PATH_TOLERANCE_PX,
  STROKE_ERASER_SHAPES,
  STROKE_ERASER_TOOL_ACTION_NAME,
  STROKE_ERASER_TOOL_STATE,
} from './constants';
import {
  eraserRadiusInCanvas,
  nodeSpaceEraser,
  sameEraser,
} from './local-space';
import type {
  WeaveStrokeEraserShape,
  WeaveStrokeEraserToolActionState,
  WeaveStrokeEraserToolParams,
  WeaveStrokeEraserToolProps,
} from './types';

type XY = { x: number; y: number };

/** A stroke the current gesture can erase, and what has been erased of it so far. */
type EraseTarget = {
  node: Konva.Node;
  /** Bounds of the node in the space of the main layer, with room for the stroke width. */
  bounds: { x1: number; y1: number; x2: number; y2: number };
  /** One path for each stretch of the drag that went over the stroke, in the space of the node. */
  chains: WeaveStrokeErasure[];
};

/** What the commit does to a stroke the gesture erased. */
type PlannedChange = {
  target: EraseTarget;
  /** Everything erased of the stroke: what was saved, then what this drag added. */
  erasures: WeaveStrokeErasure[];
  /** Nothing of the stroke is left to see. */
  empty: boolean;
};

/** Frames a preview may wait for its node to take the committed erase, at most. */
const HANDOVER_MAX_FRAMES = 30;

/** The settings of the eraser, with what is not valid left out. */
function settingsOf(
  props: Partial<WeaveStrokeEraserToolProps> | undefined
): WeaveStrokeEraserToolProps {
  const size = props?.size;
  const shape = props?.shape;
  return {
    size:
      typeof size === 'number' && Number.isFinite(size) && size > 0
        ? size
        : STROKE_ERASER_DEFAULT_PROPS.size,
    shape: STROKE_ERASER_SHAPES.includes(shape as WeaveStrokeEraserShape)
      ? (shape as WeaveStrokeEraserShape)
      : STROKE_ERASER_DEFAULT_PROPS.shape,
  };
}

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

    this.defaultProps = settingsOf(params?.config);

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
    return settingsOf(this.props as Partial<WeaveStrokeEraserToolProps>);
  }

  /** Changes the size or the shape of the eraser, also while the tool is in use: the ring follows. */
  updateProps(props: WeaveElementAttributes): void {
    super.updateProps(props);
    if (this.cursor) this.buildCursor();
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
      // its erasures are about to change: a mask now would be for the old ones
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
        chains: [],
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
    const { size, shape } = this.getSettings();
    const half = eraserRadiusInCanvas(size / 2, zoom);
    this.lastPoint = point;

    // a square is as far from its centre as its half side along each axis
    const x1 = Math.min(from.x, point.x) - half;
    const x2 = Math.max(from.x, point.x) + half;
    const y1 = Math.min(from.y, point.y) - half;
    const y2 = Math.max(from.y, point.y) + half;

    for (const target of this.targets.values()) {
      const b = target.bounds;
      if (x2 < b.x1 || x1 > b.x2 || y2 < b.y1 || y1 > b.y2) continue;

      const eraser = nodeSpaceEraser(target.node, layer, shape, half);
      const a = eraser.toNode(from);
      const p = eraser.toNode(point);

      // the path goes on while the eraser is the same and the last step ended where this one starts
      const chain = target.chains.at(-1);
      const n = chain?.points.length ?? 0;
      if (
        chain &&
        sameEraser(chain, eraser.stamp) &&
        chain.points[n - 2] === a.x &&
        chain.points[n - 1] === a.y
      ) {
        chain.points.push(p.x, p.y);
      } else {
        target.chains.push({ ...eraser.stamp, points: [a.x, a.y, p.x, p.y] });
      }

      handler.setEraseMask(target.node, target.chains.slice());
    }
  }

  private clearMasks(): void {
    const handler = this.strokeHandler();
    for (const target of this.targets.values()) {
      if (target.chains.length > 0) handler?.setEraseMask(target.node, null);
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
   * What each stroke the drag reached becomes: its saved erasures with what the
   * drag added, the path of each reduced to a tenth of a screen pixel. A stroke
   * whose ink the eraser never touched is left out, and one with nothing left to
   * see is marked to be removed.
   */
  private planChanges(
    targets: EraseTarget[],
    handler: WeaveStrokeNode
  ): PlannedChange[] {
    const changes: PlannedChange[] = [];

    for (const target of targets) {
      if (target.chains.length === 0 || !this.canErase(target.node)) continue;

      const geometry = handler.getRenderedGeometry(target.node);
      if (!geometry) continue;

      // points are in the space of the node: one screen pixel is this much of it
      const scale = target.node.getAbsoluteScale().x;
      const pixel = 1 / (Number.isFinite(scale) && scale > 0 ? scale : 1);

      const added = target.chains.map((chain) =>
        compactErasure(chain, STROKE_ERASER_PATH_TOLERANCE_PX * pixel)
      );
      if (!touchesInk(geometry, holesOfAll(added), pixel)) continue;

      const extent = handler.getVisibleExtent(target.node, added);
      if (!extent) continue;

      changes.push({
        target,
        erasures: [...readErasures(target.node.getAttrs().erasures), ...added],
        empty: extent.empty,
      });
    }

    return changes;
  }

  /**
   * Writes the gesture to the document in one transaction, under a mutex lock
   * on the strokes it changes: each gets the new erasures, and a stroke nothing
   * of which is left to see is removed. If anything fails the previews are taken
   * off and nothing is left locked.
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
        if (!written.has(target) && target.chains.length > 0) {
          handler.setEraseMask(target.node, null);
        }
      }
      if (changes.length === 0) return;

      // Armed before the write: the host may render it at once, and a preview
      // kept past that would be drawn over the saved erase.
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

  private writeChange({ target, erasures, empty }: PlannedChange): void {
    const handler = this.strokeHandler();
    if (!handler) return;

    const serialized = handler.serialize(target.node as WeaveElementInstance);

    if (empty) {
      this.instance.removeNodeNT(serialized);
      return;
    }

    const element: WeaveStateElement = {
      ...serialized,
      props: { ...serialized.props, erasures },
    };
    this.instance.updateNodeNT(element);
  }

  /**
   * Keeps the preview of a stroke on screen until the node has taken the saved
   * erase, so there is no frame in which the whole stroke shows again: the host
   * renders the written state asynchronously. Returns a function that stops
   * waiting.
   */
  private releaseMaskWhenUpdated(target: EraseTarget): () => void {
    const handler = this.strokeHandler();
    const node = target.node;
    let finished = false;
    this.pendingHandover.add(node);

    const stop = () => {
      finished = true;
      this.pendingHandover.delete(node);
      node.off('erasuresChange.strokeEraser');
    };
    const release = () => {
      if (finished) return;
      stop();
      handler?.setEraseMask(node, null);
    };

    node.on('erasuresChange.strokeEraser', release);

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
    const { size, shape } = this.getSettings();
    const radius = size / 2;
    const pos = stage.getRelativePointerPosition() ?? { x: 0, y: 0 };

    this.cursor = new Konva.Group({
      x: pos.x,
      y: pos.y,
      scale: { x: 1 / stage.scaleX(), y: 1 / stage.scaleY() },
      listening: false,
      draggable: false,
    });

    const outline = (grow: number, stroke: string) =>
      shape === 'square'
        ? new Konva.Rect({
            x: -(radius + grow),
            y: -(radius + grow),
            width: 2 * (radius + grow),
            height: 2 * (radius + grow),
            stroke,
            strokeWidth: 1,
            listening: false,
          })
        : new Konva.Circle({
            radius: radius + grow,
            stroke,
            strokeWidth: 1,
            listening: false,
          });
    this.cursor.add(outline(1, STROKE_ERASER_CURSOR_STYLE.outer));
    this.cursor.add(outline(0, STROKE_ERASER_CURSOR_STYLE.inner));

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
