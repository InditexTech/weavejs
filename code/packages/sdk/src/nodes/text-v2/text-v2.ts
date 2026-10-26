// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import merge from 'lodash/merge';
import { z } from 'zod';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '@/nodes/node';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import { mergeExceptArrays, resetScale } from '@/utils/utils';
import {
  TEXT_LAYOUT,
  WEAVE_STAGE_TEXT_EDITION_MODE,
  WEAVE_TEXT_NODE_TYPE,
} from '../text/constants';
import { WeaveTextNode, isValidTextLink } from '../text/text';
import { WeaveTextV2Shape } from './shape';
import { TextEditSession, type TextEditTarget } from './edit/session';
import {
  applyMark,
  blocksToText,
  getSelectionFormat,
  indentBlocks,
  outdentBlocks,
  setBlockAlign,
  sizeToRatio,
  toggleList,
  toggleMark,
  type WeaveTextBlock,
  type WeaveTextBlockAlign,
  type WeaveTextListKind,
  type WeaveTextMarkKey,
  type WeaveTextSelectionFormat,
} from './model';
import {
  WEAVE_TEXT_V2_DEFAULT_CONFIG,
  WEAVE_TEXT_V2_SELECTION_COLOR,
} from './constants';
import type {
  WeaveTextV2NodeParams,
  WeaveTextV2OnEnterTextNodeEditMode,
  WeaveTextV2FormatChangeReason,
  WeaveTextV2OnExitTextNodeEditMode,
  WeaveTextV2OnTextFormatChange,
  WeaveTextV2OnTextSelectionChange,
  WeaveTextV2OnTextSizeWarning,
  WeaveTextV2Properties,
} from './types';

const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const SIDE_ANCHORS = ['middle-right', 'middle-left'];
const CORNER_ANCHOR_SET = new Set(CORNER_ANCHORS);
const SIDE_ANCHOR_SET = new Set(SIDE_ANCHORS);

/**
 * Drop-in replacement for `WeaveTextNode`. Same `nodeType` (`'text'`), so
 * existing documents load unchanged; register it INSTEAD of `WeaveTextNode`
 * (handlers are keyed by node type). Renders through `WeaveTextV2Shape`
 * (blocks/runs model + layout engine) instead of `Konva.Text`.
 */
export class WeaveTextV2Node extends WeaveNode {
  private readonly config: WeaveTextV2Properties;
  protected nodeType: string = WEAVE_TEXT_NODE_TYPE;
  private createNode = false;
  private editing = false;
  private editingNodeId: string | null = null;
  private session: TextEditSession | null = null;
  private sizeWarned = false;
  private selectionTimer: ReturnType<typeof setTimeout> | undefined;
  private nodeRenderedAddedRegistered = false;
  private keyPressHandler: ((e: KeyboardEvent) => void) | undefined;

  constructor(params?: WeaveTextV2NodeParams) {
    super();
    this.config = merge({}, WEAVE_TEXT_V2_DEFAULT_CONFIG, params?.config);
  }

  initialize(): void {
    this.keyPressHandler = undefined;
    this.editing = false;
    this.editingNodeId = null;
    this.session = null;
    this.nodeRenderedAddedRegistered = false;
  }

  // ---- sizing --------------------------------------------------------------

  /**
   * Resolve width/height for the layout mode. Auto modes size from the
   * engine's natural measure (independent of zoom, unlike the DOM-based
   * measure of the legacy node).
   */
  private resolveSize(
    shape: WeaveTextV2Shape,
    props: WeaveElementAttributes
  ): { width: number | undefined; height: number | undefined } {
    let width: number | undefined = props.width;
    let height: number | undefined = props.height;

    if (props.layout === TEXT_LAYOUT.AUTO_ALL) {
      const nat = shape.measureNaturalSize();
      width = nat.width + 2;
      height = nat.height + 2;
    }
    if (props.layout === TEXT_LAYOUT.SMART && !props.smartFixedWidth) {
      width = Math.max(1, shape.measureNaturalSize().width * 1.01);
      height = undefined;
    }
    if (props.layout === TEXT_LAYOUT.SMART && props.smartFixedWidth) {
      height = undefined;
    }
    if (props.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
      height = undefined;
    }
    return { width, height };
  }

  measureMultilineText(shape: WeaveTextV2Shape) {
    return () => {
      const nat = shape.measureNaturalSize();
      return {
        width: Math.max(1, nat.width),
        height: Math.max(1, nat.height),
      };
    };
  }

  // ---- render --------------------------------------------------------------

  private linkOverrides(props: WeaveElementAttributes) {
    // See the legacy node: a link forces fill/underline, the true values are
    // captured in linkPrevious* so serialize() never persists the override.
    return {
      linkPreviousFill: props.link
        ? props.linkPreviousFill ?? props.fill
        : props.linkPreviousFill,
      linkPreviousTextDecoration: props.link
        ? props.linkPreviousTextDecoration ?? props.textDecoration
        : props.linkPreviousTextDecoration,
    };
  }

  private outlineProps() {
    return this.config.outline.enabled
      ? {
          strokeEnabled: true,
          stroke: this.config.outline.color,
          strokeWidth: this.config.outline.width,
          fillAfterStrokeEnabled: true,
        }
      : { strokeEnabled: false };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const { linkPreviousFill, linkPreviousTextDecoration } =
      this.linkOverrides(props);

    const text = new WeaveTextV2Shape({
      ...props,
      name: 'node',
      ...this.outlineProps(),
      ...(props.link && {
        textDecoration: 'underline',
        fill: this.config.link.defaultColor,
        linkPreviousFill,
        linkPreviousTextDecoration,
      }),
    });

    text.setIndentStep(this.indentStep());
    text.setLinkStyle({
      color: this.config.link.defaultColor,
      hoverColor: this.config.link.hoverColor,
    });
    this.setupDefaultNodeAugmentation(text);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    text.getTransformerProperties = function () {
      const layout = this.getAttrs().layout;
      if (layout === TEXT_LAYOUT.SMART) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: true,
          keepRatio: false,
          enabledAnchors: [] as string[],
        };
      }
      if (layout === TEXT_LAYOUT.AUTO_ALL) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: false,
          enabledAnchors: [] as string[],
        };
      }
      if (layout === TEXT_LAYOUT.AUTO_HEIGHT) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: true,
          enabledAnchors: SIDE_ANCHORS,
        };
      }
      return defaultTransformerProperties;
    };

    text.allowedAnchors = function () {
      const layout = this.getAttrs().layout;
      if (layout === TEXT_LAYOUT.SMART) {
        return [...CORNER_ANCHORS, ...SIDE_ANCHORS];
      }
      if (layout === TEXT_LAYOUT.AUTO_ALL) return [];
      if (layout === TEXT_LAYOUT.AUTO_HEIGHT) return SIDE_ANCHORS;
      return [
        ...CORNER_ANCHORS,
        'top-center',
        'bottom-center',
        ...SIDE_ANCHORS,
      ];
    };

    text.setAttrs({ measureMultilineText: this.measureMultilineText(text) });

    this.setupDefaultNodeEvents(text, { performScaleReset: false });

    text.dblClick = () => {
      if (this.editing) return;
      if (!(this.isSelecting() && this.isNodeSelected(text))) return;
      this.triggerEditMode(text);
    };
    text.setAttr('triggerEditMode', this.triggerEditMode.bind(this));

    this.setupLinkBehavior(text);
    this.setupTransform(text);

    if (!this.nodeRenderedAddedRegistered) {
      this.instance.addEventListener(
        'onNodeRenderedAdded',
        (node: Konva.Node) => {
          if (
            this.editing &&
            this.editingNodeId !== null &&
            node.id() === this.editingNodeId &&
            node.getAttr('cancelEditMode')
          ) {
            node.getAttr('cancelEditMode')?.();
          }
        }
      );
      this.nodeRenderedAddedRegistered = true;
    }

    this.registerKeyPress();

    return text;
  }

  // ---- edit mode -----------------------------------------------------------

  private readonly handleKeyPress = (e: KeyboardEvent) => {
    if (
      e.code !== 'Enter' ||
      this.instance.getActiveAction() !== SELECTION_TOOL_ACTION_NAME ||
      this.editing
    ) {
      return;
    }
    e.preventDefault();
    const selected = this.getNodesSelectionPlugin()?.getSelectedNodes() ?? [];
    if (
      this.isSelecting() &&
      selected.length === 1 &&
      selected[0].getAttrs().nodeType === WEAVE_TEXT_NODE_TYPE
    ) {
      this.triggerEditMode(selected[0] as WeaveTextV2Shape);
    }
  };

  private registerKeyPress() {
    if (this.instance.isServerSide() || this.keyPressHandler) return;
    this.keyPressHandler = this.handleKeyPress.bind(this);
    window.addEventListener('keypress', this.keyPressHandler, {
      signal: this.instance.getEventsController().signal,
    });
  }

  onAdd(): void {
    this.registerKeyPress();
  }

  onDestroyInstance(): void {
    super.onDestroyInstance();
    this.session?.destroy();
    this.session = null;
    if (!this.instance.isServerSide() && this.keyPressHandler) {
      window.removeEventListener('keypress', this.keyPressHandler);
      this.keyPressHandler = undefined;
    }
  }

  /** Re-apply layout-driven width/height after live content changes. */
  private applySize(shape: WeaveTextV2Shape) {
    const { width, height } = this.resolveSize(shape, shape.getAttrs());
    shape.setAttrs({ width, height });
  }

  private editTarget(shape: WeaveTextV2Shape): TextEditTarget {
    return {
      getBlocks: () => shape.getBlocks(),
      setBlocks: (blocks) => {
        shape.setBlocks(blocks);
        this.applySize(shape);
      },
      getLayout: () => shape.ensureLayout(),
      measure: (t, f) => shape.measureText(t, f),
      getAbsoluteTransform: () => shape.getAbsoluteTransform(),
      getContentOffset: () => shape.getContentOffset(),
      getSize: () => ({ width: shape.getWidth(), height: shape.getHeight() }),
      getFontSize: () => shape.fontSize(),
      requestRedraw: () => shape.getLayer()?.batchDraw(),
      warmLayout: (blocks, budget) => shape.warmLayout(blocks, budget),
    };
  }

  private triggerEditMode(shape: WeaveTextV2Shape, create = false) {
    if (create) this.createNode = true;

    const lockAcquired = this.instance.setMutexLock({
      nodeIds: [shape.id()],
      operation: 'text-edit',
    });
    if (!lockAcquired) return;

    this.editing = true;
    this.editingNodeId = shape.id();
    this.sizeWarned = false;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    const stage = this.instance.getStage();
    const container = stage.container();
    const rect = () => container.getBoundingClientRect();

    this.session = new TextEditSession(
      this.editTarget(shape),
      {
        utilityLayer: this.instance.getUtilityLayer(),
        container,
        clientToStage: (cx, cy) => {
          const r = rect();
          const sx = r.width ? stage.width() / r.width : 1;
          const sy = r.height ? stage.height() / r.height : 1;
          return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
        },
        stageToContainer: (p) => {
          const r = rect();
          const sx = r.width ? r.width / stage.width() : 1;
          const sy = r.height ? r.height / stage.height() : 1;
          return { x: p.x * sx, y: p.y * sy };
        },
        revealCaret: (p) => {
          const box = container;
          const w = box.clientWidth;
          const h = box.clientHeight;
          if (!w || !h) return;
          const f = this.config.edition.followPadding;
          const dx =
            p.x < f.left
              ? f.left - p.x
              : p.x > w - f.right
              ? w - f.right - p.x
              : 0;
          const dy =
            p.y < f.top
              ? f.top - p.y
              : p.y > h - f.bottom
              ? h - f.bottom - p.y
              : 0;
          if (!dx && !dy) return;
          stage.x(stage.x() + dx);
          stage.y(stage.y() + dy);
          this.instance.emitEvent('onStageMove');
        },
        // Figma-like: entering edit on existing text selects it all.
        selectAllOnStart: !create,
        richText: this.isRich(shape),
        onSelectionChange: () => this.scheduleSelectionEvent(shape),
        onFormatChange: (reason) => this.emitFormatChange(shape, reason),
        caretColor: this.config.cursor.color,
        selectionColor: WEAVE_TEXT_V2_SELECTION_COLOR,
        ...(this.config.edition.outline.enabled && {
          outlineColor: this.config.edition.outline.color,
          outlineWidth: this.config.edition.outline.width,
          outlinePadding: this.config.edition.outline.padding,
        }),
        signal: this.instance.getEventsController().signal,
        onChange: (blocks) => this.checkSize(shape, blocks),
        onRequestExit: () => this.exitEditMode(shape),
      },
      shape.id()
    );

    shape.setAttr('cancelEditMode', () => this.exitEditMode(shape));

    stage.mode(WEAVE_STAGE_TEXT_EDITION_MODE);
    this.session.start();

    this.instance.emitEvent<WeaveTextV2OnEnterTextNodeEditMode>(
      'onEnterTextNodeEditMode',
      { node: shape }
    );
  }

  private checkSize(shape: WeaveTextV2Shape, blocks: WeaveTextBlock[]) {
    const threshold = this.config.sizeWarning.threshold;
    // Serialized size is always >= the plain text length: cheap pre-check.
    const textLength = blocksToText(blocks).length;
    if (textLength * 8 < threshold) {
      this.sizeWarned = false;
      return;
    }
    const size = JSON.stringify(blocks).length;
    if (size > threshold && !this.sizeWarned) {
      this.sizeWarned = true;
      this.instance.emitEvent<WeaveTextV2OnTextSizeWarning>(
        'onTextSizeWarning',
        { node: shape, size, threshold }
      );
    } else if (size <= threshold) {
      this.sizeWarned = false;
    }
  }

  private exitEditMode(shape: WeaveTextV2Shape) {
    const session = this.session;
    if (!session || !this.editing) return;

    clearTimeout(this.selectionTimer);
    const { changed } = session.getResult();
    session.destroy();
    this.session = null;

    this.instance.releaseMutexLock();
    const stage = this.instance.getStage();
    stage.mode(WEAVE_STAGE_DEFAULT_MODE);

    this.editing = false;
    this.editingNodeId = null;
    shape.setAttr('cancelEditMode', undefined);

    this.commitNode(shape, changed);

    // A freshly created node is re-added through addNode(): re-resolve the
    // live instance by id so the transformer never attaches to a dead node.
    const liveNode = stage.findOne<WeaveTextV2Shape>(`#${shape.id()}`) ?? shape;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      selectionPlugin.setSelectedNodes([liveNode]);
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().tabIndex = 1;
    stage.container().click();
    stage.container().focus();

    this.instance.emitEvent<WeaveTextV2OnExitTextNodeEditMode>(
      'onExitTextNodeEditMode',
      { node: liveNode }
    );
  }

  /** One `updateNode` per session; none when content is unchanged. */
  private commitNode(shape: WeaveTextV2Shape, changed: boolean) {
    const live =
      this.instance.getStage().findOne<WeaveTextV2Shape>(`#${shape.id()}`) ??
      shape;

    if (this.createNode) {
      const serialized = this.serialize(live);
      if (live.text() !== '') {
        const container = live.getParent();
        live.destroy();
        this.instance.addNode(serialized, container?.getAttrs().id);
      } else {
        live.destroy();
      }
    } else if (changed) {
      this.instance.updateNode(this.serialize(live));
    }
    // Shared handler: never leak the create flag into the next session.
    this.createNode = false;
  }

  private setupTransform(text: WeaveTextV2Shape) {
    let actualAnchor: string | null | undefined = undefined;
    const isSide = () => SIDE_ANCHOR_SET.has(actualAnchor ?? '');
    const isCorner = () => CORNER_ANCHOR_SET.has(actualAnchor ?? '');
    const autoWidthLayout = () =>
      [TEXT_LAYOUT.AUTO_HEIGHT, TEXT_LAYOUT.SMART].includes(
        text.getAttrs().layout
      );

    text.on('transformstart', (e) => {
      const ctrlOrMeta = e.evt.ctrlKey || e.evt.metaKey;

      this.instance.emitEvent('onTransform', e.target);

      actualAnchor = this.getNodesSelectionPlugin()
        ?.getTransformer()
        ?.getActiveAnchor();

      const layout = text.getAttrs().layout;
      this.getNodesSelectionPlugin()
        ?.getTransformer()
        ?.keepRatio(
          (layout === TEXT_LAYOUT.SMART && isCorner()) ||
            (layout === TEXT_LAYOUT.FIXED && ctrlOrMeta)
        );

      if (autoWidthLayout() && isSide()) {
        text.wrap('word');
        text.scaleY(1);
        text.height(undefined as unknown as number);
      }

      e.cancelBubble = true;
    });

    text.on('transform', () => {
      if (autoWidthLayout() && isSide()) {
        text.width(text.width() * text.scaleX());
        text.scaleX(1);
        text.scaleY(1);
        text.height(undefined as unknown as number);
        text.getLayer()?.batchDraw();
      }

      const layout = text.getAttrs().layout;
      if (
        this.isSelecting() &&
        this.isNodeSelected(text) &&
        (layout !== TEXT_LAYOUT.SMART || !isCorner())
      ) {
        // `resetScale` applies scaleX/scaleY to width/height itself: scaling the
        // width here as well applied it twice per frame (flicker while resizing).
        resetScale(text);
      }

      text.setAttr('shouldUpdateOnTransform', false);
      text.getLayer()?.batchDraw();
    });

    text.on('transformend', () => {
      this.instance.emitEvent('onTransform', null);

      let definedSmartWidth = false;
      let smartFixedWidth = text.getAttr('smartFixedWidth') ?? false;
      const layout = text.getAttrs().layout;

      if (layout !== TEXT_LAYOUT.SMART && !isCorner()) {
        this.scaleReset(text);
      }

      if (layout === TEXT_LAYOUT.SMART && isCorner()) {
        text.setAttrs({
          width: Math.ceil(text.width() * text.scaleX()),
          height: Math.ceil(text.height() * text.scaleY()),
          fontSize: text.fontSize() * text.scaleY(),
          scaleX: 1,
          scaleY: 1,
        });
      }

      if (
        autoWidthLayout() &&
        isSide() &&
        !smartFixedWidth &&
        !definedSmartWidth
      ) {
        text.setAttr('smartFixedWidth', true);
        smartFixedWidth = true;
        definedSmartWidth = true;
        text.width(Math.ceil(text.width() * text.scaleX()));
        text.scaleX(1);
        text.scaleY(1);
        text.height(undefined as unknown as number);
        text.getLayer()?.batchDraw();
        text.height(Math.ceil(text.height()));
      }

      if (
        layout === TEXT_LAYOUT.SMART &&
        isSide() &&
        smartFixedWidth &&
        !definedSmartWidth
      ) {
        text.width(Math.ceil(text.width() * text.scaleX()));
        text.scaleX(1);
      }

      this.instance.updateNode(this.serialize(text));
    });
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (this.editing && this.editingNodeId === shape.id()) {
      // Live session content wins over state echoes until commit.
      nextProps = {
        ...nextProps,
        text: shape.attrs.text,
        blocks: shape.attrs.blocks,
      };
    }
    const isLinked = Boolean(nextProps.link);
    const { linkPreviousFill, linkPreviousTextDecoration } =
      this.linkOverrides(nextProps);

    shape.setIndentStep(this.indentStep());
    shape.setAttrs({
      ...nextProps,
      ...this.outlineProps(),
      // Konva's setAttrs only touches present keys; always pass these so a
      // removed link clears the live attrs (see the legacy node for details).
      link: nextProps.link,
      linkPreviousFill: isLinked ? linkPreviousFill : undefined,
      linkPreviousTextDecoration: isLinked
        ? linkPreviousTextDecoration
        : undefined,
      ...(isLinked && {
        textDecoration: 'underline',
        fill: this.config.link.defaultColor,
      }),
    });

    // `blocks` absent in next props must clear stale blocks on the live node.
    if (nextProps.blocks === undefined && shape.attrs.blocks !== undefined) {
      shape.setAttr('blocks', undefined);
    }

    const { width, height } = this.resolveSize(shape, nextProps);
    shape.setAttrs({ width, height });

    if (!this.editing) {
      const selection = this.getNodesSelectionPlugin();
      if (selection) {
        selection.setSelectedNodes(selection.getSelectedNodes());
      }
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    // Shared state only holds plain data: never leak functions into it.
    for (const key of Object.keys(cleanedAttrs)) {
      if (typeof cleanedAttrs[key] === 'function') delete cleanedAttrs[key];
    }
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.triggerEditMode;
    delete cleanedAttrs.cancelEditMode;
    delete cleanedAttrs.measureMultilineText;
    delete cleanedAttrs.overridesMouseControl;
    delete cleanedAttrs.shouldUpdateOnTransform;
    delete cleanedAttrs.dragBoundFunc;

    if (cleanedAttrs.link) {
      if (typeof cleanedAttrs.linkPreviousFill === 'string') {
        cleanedAttrs.fill = cleanedAttrs.linkPreviousFill;
      }
      // A node created without `textDecoration` has no captured value: the
      // link underline must still never be persisted (it leaked on removal).
      cleanedAttrs.textDecoration =
        typeof cleanedAttrs.linkPreviousTextDecoration === 'string'
          ? cleanedAttrs.linkPreviousTextDecoration
          : '';
    }

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        isCloned: undefined,
        isCloneOrigin: undefined,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }

  // ---- link ----------------------------------------------------------------

  private linkCtxMenuGuardRegistered = false;
  private linkHoverText: WeaveTextV2Shape | null = null;
  private linkModifier = false;
  private linkHoverRefresh: (() => void) | null = null;

  // True when the pointer is over a link of `text` (whole-node or per-run).
  private linkHitAt(
    text: WeaveTextV2Shape
  ): { url: string; key?: string } | null {
    const link = text.getAttrs().link;
    if (link) {
      const p = this.localPointer(text);
      const inside =
        p.x >= 0 && p.y >= 0 && p.x <= text.width() && p.y <= text.height();
      return inside ? { url: link } : null;
    }
    return text.linkAtPoint(this.localPointer(text));
  }

  // macOS turns Ctrl+click into a context-menu gesture (no click event is
  // raised). On a link Ctrl/Cmd+click means "open the link", so the context
  // menu is swallowed. The listener is a DOM capture listener on the stage
  // container: when the node is selected the Konva target is the transformer,
  // not the text, so node level listeners never see the event.
  private registerLinkContextMenuGuard(): void {
    if (this.linkCtxMenuGuardRegistered || this.instance.isServerSide()) return;
    this.linkCtxMenuGuardRegistered = true;

    const stage = this.instance.getStage();
    const signal = this.instance.getEventsController().signal;

    // Links only react (hover, cursor) while Ctrl/Cmd is held.
    const syncModifier = (e: KeyboardEvent) => {
      const next = e.ctrlKey || e.metaKey;
      if (next === this.linkModifier) return;
      this.linkModifier = next;
      this.linkHoverRefresh?.();
    };
    window.addEventListener('keydown', syncModifier, { signal });
    window.addEventListener('keyup', syncModifier, { signal });
    window.addEventListener(
      'blur',
      () => {
        this.linkModifier = false;
        this.linkHoverRefresh?.();
      },
      { signal }
    );

    stage.container().addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        if (this.editing || !e.ctrlKey) return;
        const text = this.linkHoverText;
        if (!text) return;
        stage.setPointersPositions(e);
        const hit = this.linkHitAt(text);
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        this.openUrl(hit.url);
      },
      { capture: true, signal: this.instance.getEventsController().signal }
    );
  }

  private setupLinkBehavior(text: WeaveTextV2Shape): void {
    this.registerLinkContextMenuGuard();

    const container = () => this.instance.getStage().container();
    // Same as the base node: grab when selected, pointer while hovering.
    const idleCursor = () => (this.isNodeSelected(text) ? 'grab' : 'pointer');

    // Single place where hover feedback is computed. It is called from
    // `pointermove` (node not selected) and from `handleMouseover`, which the
    // selection transformer invokes on every mouse move while the node is
    // selected (the transformer overlay swallows the node's own events).
    const applyHover = () => {
      if (this.editing) return;
      this.linkHoverText = text;
      const hit = this.linkModifier ? this.linkHitAt(text) : null;
      if (!text.getAttrs().link) {
        text.setHoveredRun(hit?.key ?? null);
      } else {
        text.fill(
          hit ? this.config.link.hoverColor : this.config.link.defaultColor
        );
        text.getLayer()?.batchDraw();
      }
      container().style.cursor = hit ? 'pointer' : idleCursor();
    };

    const updateHover = (e?: { evt?: MouseEvent | PointerEvent }) => {
      if (e?.evt) this.linkModifier = e.evt.ctrlKey || e.evt.metaKey;
      this.linkHoverRefresh = applyHover;
      applyHover();
    };

    text.handleMouseover = (e?: never) => {
      updateHover(e);
    };

    text.handleMouseout = () => {
      if (this.linkHoverText === text) {
        this.linkHoverText = null;
        this.linkHoverRefresh = null;
      }
      text.setHoveredRun(null);
      if (!text.getAttrs().link) return;
      text.fill(this.config.link.defaultColor);
      text.getLayer()?.batchDraw();
    };

    text.on('pointermove', updateHover);

    text.defineMousePointer = () =>
      this.linkModifier && text.getAttrs().link ? 'pointer' : idleCursor();

    let linkClickTimeout: ReturnType<typeof setTimeout> | undefined;
    const clearLinkClickTimeout = () => {
      if (linkClickTimeout) {
        clearTimeout(linkClickTimeout);
        linkClickTimeout = undefined;
      }
    };

    const previousDblClick = text.dblClick?.bind(text) ?? (() => {});
    text.dblClick = () => {
      clearLinkClickTimeout();
      previousDblClick();
    };

    text.click = ({ wasSelected, ctrlOrMetaPressed }) => {
      const runLink = text.getAttrs().link
        ? null
        : text.linkAtPoint(this.localPointer(text));
      if (!text.getAttrs().link && !runLink) return;
      const open = () =>
        runLink ? this.openUrl(runLink.url) : this.openTextLink(text);

      if (ctrlOrMetaPressed) {
        clearLinkClickTimeout();
        open();
        return;
      }

      if (wasSelected) {
        clearLinkClickTimeout();
        linkClickTimeout = setTimeout(() => {
          linkClickTimeout = undefined;
          open();
        }, Konva.dblClickWindow);
      }
    };
  }

  private localPointer(text: WeaveTextV2Shape): { x: number; y: number } {
    return text.getRelativePointerPosition() ?? { x: -1, y: -1 };
  }

  private lastLinkOpen = 0;

  private openUrl(link: unknown): void {
    if (this.instance.isServerSide()) return;
    if (typeof link !== 'string' || !isValidTextLink(link)) return;
    // Ctrl+click can raise both `contextmenu` and `click`: open only once.
    const now = Date.now();
    if (now - this.lastLinkOpen < 500) return;
    this.lastLinkOpen = now;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  private openTextLink(textNode: WeaveTextV2Shape): void {
    this.openUrl(textNode.getAttrs().link);
  }

  getLink(nodeInstance: WeaveElementInstance): string | undefined {
    const link = nodeInstance.getAttrs().link;
    return typeof link === 'string' ? link : undefined;
  }

  setLink(nodeInstance: WeaveElementInstance, url: string): void {
    if (!isValidTextLink(url)) return;
    const serialized = this.serialize(nodeInstance);
    serialized.props.linkPreviousFill = serialized.props.fill;
    serialized.props.linkPreviousTextDecoration =
      serialized.props.textDecoration;
    serialized.props.link = url;
    this.instance.updateNode(serialized);
  }

  removeLink(nodeInstance: WeaveElementInstance): void {
    const serialized = this.serialize(nodeInstance);
    delete serialized.props.link;
    delete serialized.props.linkPreviousFill;
    delete serialized.props.linkPreviousTextDecoration;
    this.instance.updateNode(serialized);
  }

  // ---- rich text -----------------------------------------------------------

  private indentStep(): number {
    const step = this.config.richText.indentStep;
    return Number.isFinite(step) && step > 0 ? step : 1.5;
  }

  /**
   * Rich text is on for a node when its `richText` attribute says so;
   * nodes without the attribute follow `config.richText.enabled`.
   */
  isRich(nodeInstance: WeaveElementInstance): boolean {
    const own = nodeInstance.getAttrs().richText;
    return typeof own === 'boolean' ? own : this.config.richText.enabled;
  }

  isRichTextEnabled(nodeInstance?: WeaveElementInstance): boolean {
    return nodeInstance
      ? this.isRich(nodeInstance)
      : this.config.richText.enabled;
  }

  private activeSession(shape: WeaveTextV2Shape): TextEditSession | null {
    return this.editing && this.editingNodeId === shape.id()
      ? this.session
      : null;
  }

  private emitFormatChange(
    shape: WeaveTextV2Shape,
    reason: WeaveTextV2FormatChangeReason
  ) {
    this.instance.emitEvent<WeaveTextV2OnTextFormatChange>(
      'onTextFormatChange',
      { node: shape, format: this.getSelectionFormat(shape), reason }
    );
  }

  /** Selection events fire often while dragging: coalesce them. */
  private scheduleSelectionEvent(shape: WeaveTextV2Shape) {
    if (this.selectionTimer) return;
    this.selectionTimer = setTimeout(() => {
      this.selectionTimer = undefined;
      const session = this.activeSession(shape);
      if (!session) return;
      const { start, end } = session.getSelection();
      this.instance.emitEvent<WeaveTextV2OnTextSelectionChange>(
        'onTextSelectionChange',
        { node: shape, start, end, format: session.getFormat() }
      );
    }, 50);
  }

  /**
   * Format of the active selection while editing, otherwise of `range`
   * (default: the whole text). Sizes are px.
   */
  getSelectionFormat(
    nodeInstance: WeaveElementInstance,
    range?: { start: number; end: number }
  ): WeaveTextSelectionFormat {
    const shape = nodeInstance as WeaveTextV2Shape;
    const session = this.activeSession(shape);
    if (session) return session.getFormat();
    const blocks = shape.getBlocks();
    const r = range ?? { start: 0, end: blocksToText(blocks).length };
    return getSelectionFormat(blocks, r.start, r.end, shape.fontSize());
  }

  /**
   * Run a block transform on a non-editing node: one `updateNode`, so one
   * Weave undo step. Returns false when rich text is disabled.
   */
  private commandOnNode(
    shape: WeaveTextV2Shape,
    range: { start: number; end: number } | undefined,
    fn: (
      blocks: WeaveTextBlock[],
      start: number,
      end: number
    ) => WeaveTextBlock[]
  ): boolean {
    const blocks = shape.getBlocks();
    const start = range?.start ?? 0;
    const end = range?.end ?? blocksToText(blocks).length;
    const next = fn(blocks, start, end);
    if (JSON.stringify(next) === JSON.stringify(blocks)) return false;
    shape.setBlocks(next);
    this.applySize(shape);
    this.instance.updateNode(this.serialize(shape));
    this.emitFormatChange(shape, 'command');
    return true;
  }

  /**
   * Set a mark (`undefined` clears it). `size` is in px. While the node is
   * being edited it applies to the editor selection, otherwise to `range`
   * (default: the whole text).
   */
  applyMark(
    nodeInstance: WeaveElementInstance,
    key: WeaveTextMarkKey,
    value: unknown,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    let v = value;
    if (key === 'link' && v !== undefined && !isValidTextLink(String(v))) {
      return false;
    }
    if (key === 'size' && typeof value === 'number') {
      v = sizeToRatio(value, shape.fontSize());
    }
    const session = this.activeSession(shape);
    if (session) {
      session.setMark(key, v);
      return true;
    }
    return this.commandOnNode(shape, range, (b, s, e) =>
      applyMark(b, s, e, key, v)
    );
  }

  /** Link a range (or the editor selection) to an http(s) URL. */
  setRunLink(
    nodeInstance: WeaveElementInstance,
    url: string,
    range?: { start: number; end: number }
  ): boolean {
    if (typeof url !== 'string' || !isValidTextLink(url)) return false;
    return this.applyMark(nodeInstance, 'link', url, range);
  }

  removeRunLink(
    nodeInstance: WeaveElementInstance,
    range?: { start: number; end: number }
  ): boolean {
    return this.applyMark(nodeInstance, 'link', undefined, range);
  }

  toggleMark(
    nodeInstance: WeaveElementInstance,
    key: WeaveTextMarkKey,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    const session = this.activeSession(shape);
    if (session) {
      session.toggleMark(key);
      return true;
    }
    return this.commandOnNode(shape, range, (b, s, e) =>
      toggleMark(b, s, e, key)
    );
  }

  toggleList(
    nodeInstance: WeaveElementInstance,
    kind: WeaveTextListKind,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    const session = this.activeSession(shape);
    if (session) {
      session.toggleList(kind);
      return true;
    }
    return this.commandOnNode(shape, range, (b, s, e) =>
      toggleList(b, s, e, kind)
    );
  }

  /** Align every paragraph touched by the range (default: all). */
  setAlign(
    nodeInstance: WeaveElementInstance,
    align: WeaveTextBlockAlign | undefined,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    if (align !== undefined && !['left', 'center', 'right'].includes(align)) {
      return false;
    }
    const session = this.activeSession(shape);
    if (session) {
      session.setAlign(align);
      return true;
    }
    return this.commandOnNode(shape, range, (b, s, e) =>
      setBlockAlign(b, s, e, align)
    );
  }

  indent(
    nodeInstance: WeaveElementInstance,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    const session = this.activeSession(shape);
    if (session) {
      session.indent();
      return true;
    }
    return this.commandOnNode(shape, range, indentBlocks);
  }

  outdent(
    nodeInstance: WeaveElementInstance,
    range?: { start: number; end: number }
  ): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    const session = this.activeSession(shape);
    if (session) {
      session.outdent();
      return true;
    }
    return this.commandOnNode(shape, range, outdentBlocks);
  }

  /**
   * Scale the whole text: sets the node `fontSize` (px); size marks are
   * ratios of it, so every run scales with it.
   */
  setBaseFontSize(nodeInstance: WeaveElementInstance, px: number): boolean {
    const shape = nodeInstance as WeaveTextV2Shape;
    if (!this.isRich(shape)) return false;
    if (!Number.isFinite(px) || px <= 0) return false;
    if (shape.fontSize() === px) return false;
    shape.fontSize(px);
    this.applySize(shape);
    if (!this.activeSession(shape)) {
      this.instance.updateNode(this.serialize(shape));
    }
    this.emitFormatChange(shape, 'base-size');
    return true;
  }

  resetSmartLayout(textNode: WeaveTextV2Shape) {
    textNode.setAttr('smartFixedWidth', undefined);
    textNode.width(Math.max(1, textNode.measureNaturalSize().width * 1.01));
    this.instance.updateNode(this.serialize(textNode));
  }

  // ---- state ---------------------------------------------------------------

  static defaultState<WeaveTextProperties>(
    nodeId: string,
    params?: { config: WeaveTextProperties }
  ): WeaveStateElement {
    // Identical to the legacy node: same document shape.
    return WeaveTextNode.defaultState<WeaveTextProperties>(nodeId, params);
  }

  static addNodeState(
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(
      WeaveTextNode.addNodeState(defaultNodeState, props),
      { props: { ...(props.blocks && { blocks: props.blocks }) } }
    );
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    const next = WeaveTextNode.updateNodeState(prevNodeState, nextProps);
    // `blocks` is an array of objects: replace wholesale, never deep-merge.
    if (nextProps.blocks) next.props.blocks = nextProps.blocks;
    else delete next.props.blocks;
    return next;
  }

  static getSchema() {
    const base = WeaveTextNode.getSchema();
    const marks = z
      .object({
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
        strike: z.boolean().optional(),
        color: z.string().optional(),
        size: z
          .number()
          .positive()
          .optional()
          .describe('Ratio of the node fontSize (1 is omitted).'),
        family: z.string().optional(),
        lineHeight: z.number().positive().optional(),
        link: z
          .string()
          .url()
          .refine((value) => isValidTextLink(value), {
            message: 'Link must be an absolute http:// or https:// URL.',
          })
          .optional(),
      })
      .passthrough();
    const block = z.object({
      runs: z.array(z.object({ t: z.string(), m: marks.optional() })),
      kind: z.enum(['ul', 'ol']).optional(),
      depth: z.number().int().min(0).optional(),
      start: z.number().int().min(1).optional(),
      align: z.enum(['left', 'center', 'right']).optional(),
    });
    return base.extend({
      props: base.shape.props.extend({
        richText: z
          .boolean()
          .optional()
          .describe('Enables rich text commands for this node.'),
        blocks: z
          .array(block)
          .optional()
          .describe(
            'Rich content: paragraphs of runs with marks and optional list ' +
              'fields. `text` is the derived plain mirror.'
          ),
      }),
    });
  }
}
