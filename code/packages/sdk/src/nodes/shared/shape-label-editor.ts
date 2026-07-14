// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Weave } from '@/weave';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { getTopmostShadowHost, isInShadowDOM } from '@/utils/utils';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
  WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE,
} from './shape-label.constants';
import type { WeaveShapeLabelTextBounds } from './shape-label.types';

export class WeaveShapeLabelEditor {
  private readonly instance: Weave;
  private editing: boolean = false;
  private editingGroup: Konva.Group | null = null;
  private editingTextBounds: WeaveShapeLabelTextBounds | null = null;
  private textArea: HTMLTextAreaElement | null = null;
  private onLiveResize: ((neededShapeHeight: number) => void) | null = null;
  private restoreUserSelect: (() => void) | null = null;

  constructor(instance: Weave) {
    this.instance = instance;
  }

  isEditing(): boolean {
    return this.editing;
  }

  // Konva applies `user-select: none` to its content div (`.konvajs-content`)
  // to stop the canvas being selected while dragging. That rule also cancels
  // the browser's native text-selection extension the moment the pointer leaves
  // the overlay textarea and moves over the canvas, so click-dragging to select
  // multiline label text "breaks" as soon as the cursor exits the textarea.
  // While editing, allow text selection on the stage content and restore the
  // original value on teardown.
  private enableStageTextSelection(): void {
    const stage = this.instance.getStage();
    const targets: HTMLElement[] = [];
    const content = (stage as unknown as { content?: HTMLElement }).content;
    if (content) {
      targets.push(content);
    }
    const container = stage.container();
    if (container && container !== content) {
      targets.push(container);
    }

    const previous = targets.map((el) => ({
      el,
      userSelect: el.style.userSelect,
      webkitUserSelect: el.style.getPropertyValue('-webkit-user-select'),
    }));

    for (const el of targets) {
      el.style.userSelect = 'text';
      el.style.setProperty('-webkit-user-select', 'text');
    }

    this.restoreUserSelect = () => {
      for (const { el, userSelect, webkitUserSelect } of previous) {
        el.style.userSelect = userSelect;
        if (webkitUserSelect) {
          el.style.setProperty('-webkit-user-select', webkitUserSelect);
        } else {
          el.style.removeProperty('-webkit-user-select');
        }
      }
      this.restoreUserSelect = null;
    };
  }

  renderLabel(
    group: Konva.Group,
    props: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds
  ): Konva.Text {
    const labelText = props.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

    const labelNode = new Konva.Text({
      id: labelId(props.id as string),
      x: textBounds.x,
      y: textBounds.y,
      width: textBounds.width,
      height: textBounds.height,
      text: labelText,
      fontFamily:
        props.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
      fontSize: props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
      fontStyle:
        props.labelFontStyle ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontStyle,
      fontVariant:
        props.labelFontVariant ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontVariant,
      textDecoration:
        props.labelTextDecoration ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelTextDecoration,
      fill: props.labelFill ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFill,
      align: props.labelAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign,
      verticalAlign:
        props.labelVerticalAlign ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign,
      letterSpacing:
        props.labelLetterSpacing ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelLetterSpacing,
      lineHeight:
        props.labelLineHeight ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight,
      wrap: 'word',
      listening: false,
      visible: labelText !== '',
    });

    group.add(labelNode);
    return labelNode;
  }

  updateLabel(
    group: Konva.Group,
    nextProps: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds,
    growCallback?: (neededShapeHeight: number) => void
  ): void {
    const labelNode = group.findOne<Konva.Text>(
      `#${labelId(nextProps.id as string)}`
    );
    if (!labelNode) {
      return;
    }

    const labelText =
      nextProps.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

    labelNode.setAttrs({
      x: textBounds.x,
      y: textBounds.y,
      width: textBounds.width,
      height: textBounds.height,
      text: labelText,
      fontFamily:
        nextProps.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
      fontSize:
        nextProps.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
      fontStyle:
        nextProps.labelFontStyle ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontStyle,
      fontVariant:
        nextProps.labelFontVariant ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelFontVariant,
      textDecoration:
        nextProps.labelTextDecoration ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelTextDecoration,
      fill: nextProps.labelFill ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFill,
      align: nextProps.labelAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign,
      verticalAlign:
        nextProps.labelVerticalAlign ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign,
      letterSpacing:
        nextProps.labelLetterSpacing ??
        WEAVE_SHAPE_LABEL_DEFAULTS.labelLetterSpacing,
      lineHeight:
        nextProps.labelLineHeight ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight,
      wrap: 'word',
      visible: !this.editing && labelText !== '',
    });
    // when height is any explicit number — including 0 — so height(0) does NOT
    // enable auto-height. Only `attrs.height === undefined` triggers the auto
    // computation: `fontSize * lineCount * lineHeight + padding*2`.
    if (labelText !== '') {
      labelNode.setAttr('height', undefined);
      const measuredHeight = labelNode.height();
      // Restore to at least textBounds.height (needed for verticalAlign: 'middle')
      labelNode.height(Math.max(textBounds.height, measuredHeight));

      if (growCallback && measuredHeight > textBounds.height) {
        const paddingY =
          nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
        growCallback(measuredHeight + paddingY * 2);
      }
    }
  }

  private computeVerticalOffset(
    verticalAlign: string,
    boundsHeightPx: number,
    contentHeightPx: number
  ): number {
    if (verticalAlign === 'top') return 0;
    if (verticalAlign === 'bottom')
      return Math.max(0, boundsHeightPx - contentHeightPx);
    // 'middle' is the default
    return Math.max(0, (boundsHeightPx - contentHeightPx) / 2);
  }

  triggerEditMode(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    onCommit: (labelText: string) => void,
    onLiveResize?: (neededShapeHeight: number) => void
  ): void {
    if (this.editing) {
      return;
    }

    const lockAcquired = this.instance.setMutexLock({
      nodeIds: [group.id()],
      operation: 'label-edit',
    });

    if (!lockAcquired) {
      return;
    }

    this.editing = true;
    this.editingGroup = group;
    this.editingTextBounds = textBounds;
    this.onLiveResize = onLiveResize ?? null;

    // Hide the label Konva.Text during editing so the textarea appears in its place
    const labelNode = group.findOne<Konva.Text>(`#${labelId(group.id())}`);
    if (labelNode) {
      labelNode.visible(false);
    }

    // Disable selection plugin / hide transformer
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    // Compute screen position of the textBounds top-left corner
    const stage = this.instance.getStage();
    const upscaleScale = (stage.getAttr('upscaleScale') as number) ?? 1;
    const absoluteTransform = group.getAbsoluteTransform();
    const topLeft = absoluteTransform.point({
      x: textBounds.x,
      y: textBounds.y,
    });

    this.createTextAreaDOM(
      group,
      textBounds,
      topLeft,
      upscaleScale,
      onCommit,
      onLiveResize
    );
    this.instance.getStage().mode(WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE);
  }

  exitEditMode(): void {
    if (!this.editing) {
      return;
    }

    this.instance.releaseMutexLock();
    this.instance.getStage().mode(WEAVE_STAGE_DEFAULT_MODE);
    this.editing = false;

    this.restoreUserSelect?.();

    // Capture the id before nulling so we can re-select after re-enabling.
    const editedGroupId = this.editingGroup?.id() ?? null;

    // Restore label visibility on the live node (onUpdate will set the
    // authoritative value once the committed text arrives via Yjs).
    if (this.editingGroup) {
      const liveGroup = this.instance
        .getStage()
        .findOne<Konva.Group>(`#${this.editingGroup.id()}`);
      const labelNode = liveGroup?.findOne<Konva.Text>(
        `#${labelId(this.editingGroup.id())}`
      );
      if (labelNode) {
        labelNode.visible(true);
        labelNode.getLayer()?.batchDraw();
      }
      this.editingGroup = null;
    }

    if (this.textArea) {
      this.textArea.remove();
    }
    this.textArea = null;
    this.onLiveResize = null;
    this.editingTextBounds = null;

    // Remove the pan-tracking stage listener registered at edit start.
    this.instance.getStage().off('.weaveLabelEdit');

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      // Re-select the shape that was being edited so the user does not have to
      // click again after finishing label input.
      if (editedGroupId) {
        requestAnimationFrame(() => {
          const liveGroup = this.instance
            .getStage()
            .findOne<Konva.Group>(`#${editedGroupId}`);
          if (liveGroup) {
            selectionPlugin.setSelectedNodes([liveGroup]);
          }
        });
      }
    }
  }

  updateTextAreaPosition(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds
  ): void {
    if (!this.editing || !this.textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const upscaleScale = (stage.getAttr('upscaleScale') as number) ?? 1;
    const absoluteTransform = group.getAbsoluteTransform();
    const topLeft = absoluteTransform.point({
      x: textBounds.x,
      y: textBounds.y,
    });

    this.textArea.style.left = `${topLeft.x * upscaleScale}px`;

    const absScale = group.getAbsoluteScale();
    const props = group.getAttrs() as WeaveElementAttributes;
    const fontSize =
      (props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize) *
      absScale.x;
    this.textArea.style.fontSize = `${fontSize * upscaleScale}px`;

    const textWidth = textBounds.width * absScale.x;
    this.textArea.style.width = `${textWidth * upscaleScale}px`;

    const originalBoundsHeightPx =
      textBounds.height * absScale.y * upscaleScale;
    const paddingY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const verticalAlign =
      props.labelVerticalAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign;

    this.textArea.style.height = 'auto';
    const contentHeightPx = this.textArea.scrollHeight;

    if (contentHeightPx <= originalBoundsHeightPx) {
      this.textArea.style.height = `${contentHeightPx}px`;
      const offsetY = this.computeVerticalOffset(
        verticalAlign,
        originalBoundsHeightPx,
        contentHeightPx
      );
      this.textArea.style.top = `${topLeft.y * upscaleScale + offsetY}px`;
    } else {
      this.textArea.style.height = `${contentHeightPx}px`;
      this.textArea.style.top = `${topLeft.y * upscaleScale}px`;
    }

    if (this.onLiveResize) {
      const contentHeightInCanvas =
        contentHeightPx / (absScale.y * upscaleScale);
      this.onLiveResize(contentHeightInCanvas + paddingY * 2);
    }
  }

  /**
   * Updates the textarea `left`, `width`, and `top` to match new text bounds.
   * Call this from an `onLiveResize` callback when the shape grows symmetrically
   * (e.g. regular polygon) so the textarea tracks the new position on all axes.
   * Does NOT call `onLiveResize` — there is no re-entrancy risk, but also no need.
   */
  repositionTextArea(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds
  ): void {
    if (!this.editing || !this.textArea) return;
    // Track latest bounds so pan listener and resizeTextarea stay in sync
    // with any growth/restore that happened since edit mode was entered.
    this.editingTextBounds = textBounds;
    const stage = this.instance.getStage();
    const upscaleScale = (stage.getAttr('upscaleScale') as number) ?? 1;
    const absoluteTransform = group.getAbsoluteTransform();
    const topLeft = absoluteTransform.point({
      x: textBounds.x,
      y: textBounds.y,
    });
    const absScale = group.getAbsoluteScale();
    const textWidth = textBounds.width * absScale.x;
    this.textArea.style.left = `${topLeft.x * upscaleScale}px`;
    this.textArea.style.width = `${textWidth * upscaleScale}px`;

    // Update top so it tracks the new textBounds.y after growing or restoring.
    // Align content vertically within the new bounds based on labelVerticalAlign;
    // snap to top when content overflows.
    // We must read the ACTUAL content height, not `scrollHeight` (which is
    // max(style.height, content)) — otherwise a stale large style.height gives
    // a wrong offsetY.  Temporarily set height to 'auto' to get the true value.
    const newBoundsHeightPx = textBounds.height * absScale.y * upscaleScale;
    const savedHeight = this.textArea.style.height;
    this.textArea.style.height = 'auto';
    const actualContentHeightPx = this.textArea.scrollHeight;
    this.textArea.style.height = savedHeight;
    const groupProps = group.getAttrs() as WeaveElementAttributes;
    const verticalAlign =
      groupProps.labelVerticalAlign ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign;
    const offsetY = this.computeVerticalOffset(
      verticalAlign,
      newBoundsHeightPx,
      actualContentHeightPx
    );
    this.textArea.style.top = `${topLeft.y * upscaleScale + offsetY}px`;
  }

  /**
   * Convergence loop: onLiveResize may change the textarea width (e.g. a
   * growing polygon becomes wider), which changes line-wrapping, which may
   * require a different shape height. Iterates until scrollHeight is stable
   * or a safety limit is reached (5 passes cover any practical input).
   *
   * Oscillation prevention: if the sequence alternates (narrow→grow→wide→
   * restore→narrow→…) the loop exits with the polygon under-sized.
   * We track `lastUsedPx` — the height last passed to onLiveResize — and
   * fire a final corrective grow whenever `prevHeightPx > lastUsedPx`
   * (content at the current width still overflows what was last asked for).
   */
  private runLiveResizeLoop(
    onLiveResize: (neededShapeHeight: number) => void,
    contentHeightPx: number,
    effectiveScale: number,
    upscaleScale: number,
    paddingY: number
  ): void {
    const MAX_PASSES = 5;
    let maxNeededPx = contentHeightPx;
    let prevHeightPx = contentHeightPx;
    let lastUsedPx = 0;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      lastUsedPx = prevHeightPx;
      const neededInCanvas = prevHeightPx / (effectiveScale * upscaleScale);
      onLiveResize(neededInCanvas + paddingY * 2);

      if (!this.textArea) break;
      this.textArea.style.height = 'auto';
      const measuredPx = this.textArea.scrollHeight;
      this.textArea.style.height = `${measuredPx}px`;

      if (measuredPx > maxNeededPx) {
        maxNeededPx = measuredPx;
      }
      if (measuredPx === prevHeightPx) break; // stable
      prevHeightPx = measuredPx;
    }

    // Final guarantee: if the last measured content height exceeds what we
    // passed to onLiveResize in the final iteration (polygon under-sized due
    // to oscillation), grow one last time to the maximum observed height.
    if (this.textArea && prevHeightPx > lastUsedPx) {
      const finalInCanvas = maxNeededPx / (effectiveScale * upscaleScale);
      onLiveResize(finalInCanvas + paddingY * 2);
      this.textArea.style.height = 'auto';
      const finalPx = this.textArea.scrollHeight;
      this.textArea.style.height = `${finalPx}px`;
    }
  }

  private createTextAreaDOM(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    position: Konva.Vector2d,
    upscaleScale: number,
    onCommit: (labelText: string) => void,
    onLiveResize?: (neededShapeHeight: number) => void
  ): void {
    const stage = this.instance.getStage();
    const props = group.getAttrs() as WeaveElementAttributes;
    const absScale = group.getAbsoluteScale();
    const effectiveScale = absScale.x;

    this.enableStageTextSelection();

    this.textArea = document.createElement('textarea');
    this.textArea.id = `${group.id()}_label_textarea`;
    // Override the HTML default of rows=2 so the textarea starts as a single
    // line; resizeTextarea (called in requestAnimationFrame) computes the final
    // height from scrollHeight and will expand it as needed.
    this.textArea.rows = 1;

    stage.container().appendChild(this.textArea);

    // Reposition the textarea whenever the stage is panned so it always
    // overlays the shape's label area.  The listener is removed in exitEditMode.
    stage.on(
      'dragmove.weaveLabelEdit xChange.weaveLabelEdit yChange.weaveLabelEdit',
      () => {
        if (this.editingGroup && this.editingTextBounds) {
          this.repositionTextArea(this.editingGroup, this.editingTextBounds);
        }
      }
    );

    const textWidth = textBounds.width * effectiveScale;
    const fontSize =
      (props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize) *
      effectiveScale;
    // Original textBounds height in screen pixels — used for centering & overflow detection
    const originalBoundsHeightPx =
      textBounds.height * effectiveScale * upscaleScale;
    const paddingY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;

    // Position and size — top will be adjusted by resizeTextarea once content height is known.
    // Keep the element invisible until resizeTextarea() sets the correct top so it
    // does not flash at the wrong vertical position for one animation frame.
    this.textArea.style.position = 'absolute';
    this.textArea.style.visibility = 'hidden';
    this.textArea.style.left = `${position.x * upscaleScale}px`;
    this.textArea.style.width = `${textWidth * upscaleScale}px`;

    // Visual appearance
    this.textArea.style.border = 'solid 0px #1e40af';
    this.textArea.style.background = 'transparent';
    this.textArea.style.backgroundColor = 'transparent';
    this.textArea.style.boxSizing = 'border-box';
    this.textArea.style.overflow = 'hidden';

    // Rotation
    const rotation = group.getAbsoluteRotation();
    if (rotation) {
      this.textArea.style.transformOrigin = 'left top';
      this.textArea.style.transform = `rotate(${rotation}deg)`;
    }

    // Font styles
    this.textArea.value = props.labelText ?? '';
    this.textArea.style.fontSize = `${fontSize * upscaleScale}px`;
    this.textArea.style.fontFamily =
      props.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily;
    this.textArea.style.letterSpacing = `${
      props.labelLetterSpacing ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLetterSpacing
    }px`;
    this.textArea.style.lineHeight = `${
      props.labelLineHeight ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight
    }em`;
    const fontStyle =
      props.labelFontStyle ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontStyle;
    this.textArea.style.fontStyle = fontStyle.includes('italic')
      ? 'italic'
      : 'normal';
    this.textArea.style.textDecoration =
      props.labelTextDecoration ??
      WEAVE_SHAPE_LABEL_DEFAULTS.labelTextDecoration;
    let fontWeight = 'normal';
    const matchNumber = fontStyle.match(/\d+/);
    if (fontStyle.includes('bold')) {
      fontWeight = 'bold';
    }
    if (matchNumber) {
      fontWeight = matchNumber[0];
    }
    this.textArea.style.fontWeight = fontWeight;
    this.textArea.style.fontVariant =
      props.labelFontVariant ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontVariant;
    this.textArea.style.color =
      props.labelFill ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFill;
    this.textArea.style.textAlign =
      props.labelAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign;
    this.textArea.style.outline = 'none';
    this.textArea.style.resize = 'none';
    this.textArea.style.margin = '0';
    this.textArea.style.padding = '0';
    this.textArea.style.caretColor = 'black';
    this.textArea.style.overscrollBehavior = 'contains';

    const resizeTextarea = () => {
      if (!this.textArea) {
        return;
      }

      // Measure the natural content height
      this.textArea.style.height = 'auto';
      const contentHeightPx = this.textArea.scrollHeight;

      const fonts = this.instance.getFonts();
      const font = fonts.find(
        (f) =>
          f.name ===
          (props.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily)
      );

      // Use live absolute transform so left/top stay correct after the stage
      // is panned.  editingTextBounds tracks the latest bounds (updated by
      // repositionTextArea after any grow/restore) so the coords are always
      // relative to the current shape size, not just the initial click size.
      const currentBounds = this.editingTextBounds ?? textBounds;
      const liveTL = group.getAbsoluteTransform().point({
        x: currentBounds.x,
        y: currentBounds.y + (font?.offsetY ?? 0),
      });
      this.textArea.style.left = `${liveTL.x * upscaleScale}px`;

      if (contentHeightPx <= originalBoundsHeightPx) {
        // Content fits: set height and position according to labelVerticalAlign
        this.textArea.style.height = `${contentHeightPx}px`;
        const verticalAlign =
          props.labelVerticalAlign ??
          WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign;
        const offsetY = this.computeVerticalOffset(
          verticalAlign,
          originalBoundsHeightPx,
          contentHeightPx
        );
        this.textArea.style.top = `${liveTL.y * upscaleScale + offsetY}px`;
      } else {
        // Content overflows: snap to textBounds top
        this.textArea.style.height = `${contentHeightPx}px`;
        this.textArea.style.top = `${liveTL.y * upscaleScale}px`;
      }

      // Convergence loop: see runLiveResizeLoop for full explanation.
      if (onLiveResize) {
        this.runLiveResizeLoop(
          onLiveResize,
          contentHeightPx,
          effectiveScale,
          upscaleScale,
          paddingY
        );
      }

      // Reveal the textarea now that top/height are correctly set.
      // (It was hidden with visibility:hidden to prevent a one-frame flash
      // at the wrong position before this first resizeTextarea call.)
      if (this.textArea.style.visibility === 'hidden') {
        this.textArea.style.visibility = '';
      }
    };

    const commit = (text: string) => {
      window.removeEventListener('pointerup', handleOutsideClick);
      window.removeEventListener('pointerdown', handlePointerDown);
      this.exitEditMode();
      // exitEditMode already shows the label; apply the precise visibility
      // based on the committed text, using the live group in case the node
      // was recreated by the reconciler since triggerEditMode was called.
      const liveGroup = this.instance
        .getStage()
        .findOne<Konva.Group>(`#${group.id()}`);
      const labelNode = liveGroup?.findOne<Konva.Text>(
        `#${labelId(group.id())}`
      );
      if (labelNode) {
        labelNode.visible(text !== '');
      }
      onCommit(text);
    };

    this.textArea.addEventListener(
      'keydown',
      (e) => {
        e.stopPropagation();
        if (e.code === 'Escape') {
          e.preventDefault();
          commit(this.textArea?.value ?? '');
          return;
        }
        resizeTextarea();
      },
      { signal: this.instance.getEventsController().signal }
    );

    this.textArea.addEventListener('keyup', () => resizeTextarea(), {
      signal: this.instance.getEventsController().signal,
    });

    this.textArea.addEventListener('input', () => resizeTextarea(), {
      signal: this.instance.getEventsController().signal,
    });

    this.textArea.addEventListener(
      'scroll',
      () => {
        if (this.textArea) {
          this.textArea.scrollTop = 0;
          this.textArea.scrollLeft = 0;
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    // Track where the pointer gesture started. A text-selection drag begins
    // inside the textarea but may release outside it; that must NOT be treated
    // as an outside click, otherwise the editor is torn down mid-selection.
    let pointerDownInsideTextArea = false;
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownInsideTextArea =
        !!this.textArea && this.textArea.contains(e.target as Node | null);
    };

    const handleOutsideClick = (e: PointerEvent) => {
      e.stopPropagation();
      if (!this.textArea) {
        return;
      }

      // Gesture started inside the textarea (e.g. dragging to select text and
      // releasing outside its bounds): keep the editor open and reset origin.
      if (pointerDownInsideTextArea) {
        pointerDownInsideTextArea = false;
        return;
      }

      const mouseX = e.clientX;
      const mouseY = e.clientY;
      let elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      if (isInShadowDOM(stage.container())) {
        const shadowHost = getTopmostShadowHost(stage.container());
        if (shadowHost) {
          elementUnderMouse = shadowHost.elementFromPoint(mouseX, mouseY);
        }
      }

      const clickedOutside =
        (elementUnderMouse as Element)?.id !== `${group.id()}_label_textarea`;
      if (clickedOutside) {
        commit(this.textArea.value);
      }
    };

    setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, {
        signal: this.instance.getEventsController().signal,
      });
      window.addEventListener('pointerup', handleOutsideClick, {
        signal: this.instance.getEventsController().signal,
      });
    }, 0);

    this.textArea.tabIndex = 1;
    requestAnimationFrame(() => {
      resizeTextarea();
      this.textArea?.focus({ preventScroll: true });
      if (this.textArea?.value) {
        this.textArea.select();
      }
    });
  }
}
