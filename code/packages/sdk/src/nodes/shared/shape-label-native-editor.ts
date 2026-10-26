// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Weave } from '@/weave';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import { WeaveTextV2Shape } from '@/nodes/text-v2/shape';
import { blocksToText, hasMarks, type WeaveTextBlock } from '@/nodes/text-v2/model';
import { resolveLabelBlocks } from './shape-label.utils';
import { WEAVE_TEXT_V2_SELECTION_COLOR } from '@/nodes/text-v2/constants';
import {
  TextEditSession,
  type TextEditHost,
  type TextEditTarget,
} from '@/nodes/text-v2/edit/session';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
  WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE,
} from './shape-label.constants';
import type {
  WeaveShapeLabelOnEnterEditMode,
  WeaveShapeLabelOnExitEditMode,
  WeaveShapeLabelOnFormatChange,
  WeaveShapeLabelEngine,
  WeaveShapeLabelTextBounds,
} from './shape-label.types';

const MAX_GROW_PASSES = 5;

function labelShapeAttrs(
  props: WeaveElementAttributes,
  textBounds: WeaveShapeLabelTextBounds
) {
  const d = WEAVE_SHAPE_LABEL_DEFAULTS;
  return {
    x: textBounds.x,
    y: textBounds.y,
    width: textBounds.width,
    height: textBounds.height,
    fontFamily: props.labelFontFamily ?? d.labelFontFamily,
    fontSize: props.labelFontSize ?? d.labelFontSize,
    fontStyle: props.labelFontStyle ?? d.labelFontStyle,
    fontVariant: props.labelFontVariant ?? d.labelFontVariant,
    textDecoration: props.labelTextDecoration ?? d.labelTextDecoration,
    fill: props.labelFill ?? d.labelFill,
    align: props.labelAlign ?? d.labelAlign,
    verticalAlign: props.labelVerticalAlign ?? d.labelVerticalAlign,
    letterSpacing: props.labelLetterSpacing ?? d.labelLetterSpacing,
    lineHeight: props.labelLineHeight ?? d.labelLineHeight,
    padding: 0,
    wrap: 'word' as const,
  };
}

/**
 * Native label engine: the label is a `WeaveTextV2Shape` and editing runs
 * through `TextEditSession` (caret and selection painted on the utility
 * layer, no DOM overlay). Persists plain `labelText` only.
 */
export class WeaveShapeLabelNativeEditor implements WeaveShapeLabelEngine {
  private readonly instance: Weave;
  private editing = false;
  private editingGroup: Konva.Group | null = null;
  private editingShape: WeaveTextV2Shape | null = null;
  private editingBounds: WeaveShapeLabelTextBounds | null = null;
  private session: TextEditSession | null = null;
  private onCommit:
    | ((labelText: string, labelBlocks?: WeaveTextBlock[]) => void)
    | null = null;
  private onLiveResize: ((neededShapeHeight: number) => void) | null = null;

  constructor(instance: Weave) {
    this.instance = instance;
  }

  isEditing(): boolean {
    return this.editing;
  }

  renderLabel(
    group: Konva.Group,
    props: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds
  ): WeaveTextV2Shape {
    const labelText = props.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;
    const labelNode = new WeaveTextV2Shape({
      id: labelId(props.id as string),
      text: labelText,
      ...labelShapeAttrs(props, textBounds),
      listening: false,
      visible: labelText !== '',
    });
    const blocks = resolveLabelBlocks(props);
    if (blocks) labelNode.setBlocks(blocks);
    group.add(labelNode);
    return labelNode;
  }

  updateLabel(
    group: Konva.Group,
    nextProps: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds,
    growCallback?: (neededShapeHeight: number) => void
  ): void {
    const labelNode = group.findOne<WeaveTextV2Shape>(
      `#${labelId(nextProps.id as string)}`
    );
    if (!labelNode) return;

    const labelText =
      nextProps.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

    // While editing, the session owns the content: never overwrite it with
    // the (not yet committed) stored text.
    if (this.editing && this.editingShape === labelNode) {
      labelNode.setAttrs(labelShapeAttrs(nextProps, textBounds));
      this.editingBounds = textBounds;
      this.fitHeight(labelNode, textBounds);
      return;
    }

    labelNode.setAttrs({
      text: labelText,
      ...labelShapeAttrs(nextProps, textBounds),
      visible: labelText !== '',
    });
    // `text` above resets rich content: re-apply the stored blocks.
    const blocks = resolveLabelBlocks(nextProps);
    if (blocks) labelNode.setBlocks(blocks);

    if (labelText !== '') {
      labelNode.setAttr('height', undefined);
      const measuredHeight = labelNode.height();
      labelNode.height(Math.max(textBounds.height, measuredHeight));

      if (growCallback && measuredHeight > textBounds.height) {
        const paddingY =
          nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
        growCallback(measuredHeight + paddingY * 2);
      }
    }
  }

  /** Keep the box at least as tall as bounds and content (no negative offset). */
  private fitHeight(
    shape: WeaveTextV2Shape,
    bounds: WeaveShapeLabelTextBounds
  ): void {
    const content = this.naturalContentHeight(shape);
    const height = Math.max(bounds.height, content);
    shape.height(height);
  }

  /**
   * Content height at the current width. The layout clamps to an explicit
   * box height, so clear it first (auto-height), as the legacy label does.
   */
  private naturalContentHeight(shape: WeaveTextV2Shape): number {
    shape.setAttr('height', undefined);
    return shape.ensureLayout().contentHeight;
  }

  triggerEditMode(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    onCommit: (labelText: string, labelBlocks?: WeaveTextBlock[]) => void,
    onLiveResize?: (neededShapeHeight: number) => void
  ): void {
    if (this.editing) return;

    const shape = group.findOne<WeaveTextV2Shape>(`#${labelId(group.id())}`);
    if (!shape) return;

    const lockAcquired = this.instance.setMutexLock({
      nodeIds: [group.id()],
      operation: 'label-edit',
    });
    if (!lockAcquired) return;

    this.editing = true;
    this.editingGroup = group;
    this.editingShape = shape;
    this.editingBounds = textBounds;
    this.onCommit = onCommit;
    this.onLiveResize = onLiveResize ?? null;

    shape.visible(true);

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

    const host: TextEditHost = {
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
      caretColor: '#000000',
      selectionColor: WEAVE_TEXT_V2_SELECTION_COLOR,
      selectAllOnStart: true,
      richText: true,
      onFormatChange: () => this.emitLabelFormat(group),
      onSelectionChange: () => this.emitLabelFormat(group),
      signal: this.instance.getEventsController().signal,
      onRequestExit: () => this.commit(),
    };

    this.session = new TextEditSession(
      this.editTarget(group, shape),
      host,
      `${group.id()}-label`
    );

    stage.mode(WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE);
    this.session.start();
    this.instance.emitEvent<WeaveShapeLabelOnEnterEditMode>(
      'onEnterShapeLabelEditMode',
      { node: group, session: this.session }
    );
    this.emitLabelFormat(group);
  }

  private emitLabelFormat(group: Konva.Group): void {
    if (!this.session) return;
    this.instance.emitEvent<WeaveShapeLabelOnFormatChange>(
      'onShapeLabelFormatChange',
      { node: group, format: this.session.getFormat() }
    );
  }

  private editTarget(
    group: Konva.Group,
    shape: WeaveTextV2Shape
  ): TextEditTarget {
    return {
      getBlocks: () => shape.getBlocks(),
      setBlocks: (blocks) => {
        shape.setBlocks(blocks);
        shape.visible(true);
        this.grow(group, shape);
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

  /**
   * Grow/restore the owning shape to fit the content. Growth can change the
   * label width (polygon, ellipse), which changes wrapping, so re-measure
   * until stable; same bounds as the legacy convergence loop.
   */
  private grow(group: Konva.Group, shape: WeaveTextV2Shape): void {
    const bounds = this.editingBounds;
    if (!bounds) return;
    const attrs = group.getAttrs() as WeaveElementAttributes;
    const paddingY =
      attrs.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    const content = () => this.naturalContentHeight(shape);

    if (this.onLiveResize) {
      let prev = content();
      let max = prev;
      let lastUsed = 0;
      for (let pass = 0; pass < MAX_GROW_PASSES; pass++) {
        lastUsed = prev;
        this.onLiveResize(prev + paddingY * 2);
        const measured = content();
        if (measured > max) max = measured;
        if (measured === prev) break;
        prev = measured;
      }
      if (prev > lastUsed) this.onLiveResize(max + paddingY * 2);
    }

    this.fitHeight(shape, this.editingBounds ?? bounds);
    shape.getLayer()?.batchDraw();
  }

  /** Called by shapes that grow on more than one axis. */
  repositionTextArea(
    _group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds
  ): void {
    if (!this.editing || !this.editingShape) return;
    this.editingBounds = textBounds;
    this.editingShape.setAttrs({
      x: textBounds.x,
      y: textBounds.y,
      width: textBounds.width,
    });
    this.fitHeight(this.editingShape, textBounds);
  }

  private commit(): void {
    const session = this.session;
    const onCommit = this.onCommit;
    if (!session || !this.editing) return;
    const { blocks } = session.getResult();
    const text = blocksToText(blocks);
    // Only persist rich content; plain text stays in `labelText` alone.
    const rich = hasMarks(blocks) || blocks.some((b) => b.kind || b.align);
    const groupId = this.editingGroup?.id() ?? null;
    this.exitEditMode();
    if (groupId) {
      const live = this.instance
        .getStage()
        .findOne<Konva.Group>(`#${groupId}`)
        ?.findOne<WeaveTextV2Shape>(`#${labelId(groupId)}`);
      live?.visible(text !== '');
    }
    onCommit?.(text, rich ? blocks : undefined);
  }

  exitEditMode(): void {
    if (!this.editing) return;

    this.session?.destroy();
    this.session = null;

    this.instance.releaseMutexLock();
    this.instance.getStage().mode(WEAVE_STAGE_DEFAULT_MODE);
    this.editing = false;

    const editedGroupId = this.editingGroup?.id() ?? null;
    const exitedGroup = this.editingGroup;
    this.editingGroup = null;
    this.editingShape = null;
    this.editingBounds = null;
    this.onCommit = null;
    this.onLiveResize = null;

    if (exitedGroup) {
      this.instance.emitEvent<WeaveShapeLabelOnExitEditMode>(
        'onExitShapeLabelEditMode',
        { node: exitedGroup }
      );
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      if (editedGroupId) {
        requestAnimationFrame(() => {
          const liveGroup = this.instance
            .getStage()
            .findOne<Konva.Group>(`#${editedGroupId}`);
          if (liveGroup) selectionPlugin.setSelectedNodes([liveGroup]);
        });
      }
    }
  }
}
