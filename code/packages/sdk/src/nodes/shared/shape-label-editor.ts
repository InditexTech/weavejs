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
  private instance: Weave;
  private editing: boolean = false;
  private textAreaSuperContainer: HTMLDivElement | null = null;
  private textAreaContainer: HTMLDivElement | null = null;
  private textArea: HTMLTextAreaElement | null = null;

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
  ): Konva.Text {
    const labelText = props.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

    const label = new Konva.Text({
      id: labelId(props.id as string),
      x: textBounds.x,
      y: textBounds.y,
      width: textBounds.width,
      height: textBounds.height,
      text: labelText,
      fontFamily:
        props.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily,
      fontSize:
        props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize,
      fontStyle:
        props.labelFontStyle ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontStyle,
      fontVariant:
        props.labelFontVariant ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontVariant,
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

    group.add(label);
    return label;
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

    const labelText = nextProps.labelText ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelText;

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
      visible: labelText !== '',
    });

    // Auto-grow: if rendered text height overflows available bounds, notify the shape
    if (growCallback && labelText !== '') {
      const renderedHeight = labelNode.getSelfRect().height;
      if (renderedHeight > textBounds.height) {
        const paddingY =
          nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
        growCallback(renderedHeight + paddingY * 2);
      }
    }
  }

  triggerEditMode(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    onCommit: (labelText: string) => void
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
    const topLeft = absoluteTransform.point({ x: textBounds.x, y: textBounds.y });

    this.createTextAreaDOM(group, textBounds, topLeft, upscaleScale, onCommit);
    this.instance.getStage().mode(WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE);
  }

  exitEditMode(): void {
    if (!this.editing) {
      return;
    }

    this.instance.releaseMutexLock();
    this.instance.getStage().mode(WEAVE_STAGE_DEFAULT_MODE);
    this.editing = false;

    if (this.textAreaSuperContainer) {
      this.textAreaSuperContainer.remove();
    }
    this.textAreaSuperContainer = null;
    this.textAreaContainer = null;
    this.textArea = null;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
    }
  }

  updateTextAreaPosition(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds
  ): void {
    if (!this.editing || !this.textAreaContainer || !this.textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const upscaleScale = (stage.getAttr('upscaleScale') as number) ?? 1;
    const absoluteTransform = group.getAbsoluteTransform();
    const topLeft = absoluteTransform.point({ x: textBounds.x, y: textBounds.y });

    this.textAreaContainer.style.top = `${topLeft.y * upscaleScale}px`;
    this.textAreaContainer.style.left = `${topLeft.x * upscaleScale}px`;

    const absScale = group.getAbsoluteScale();
    const props = group.getAttrs() as WeaveElementAttributes;
    const fontSize =
      (props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize) *
      absScale.x;
    this.textArea.style.fontSize = `${fontSize * upscaleScale}px`;

    const textWidth = textBounds.width * absScale.x;
    this.textAreaContainer.style.width = `${textWidth * upscaleScale}px`;
  }

  private createTextAreaDOM(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    position: Konva.Vector2d,
    upscaleScale: number,
    onCommit: (labelText: string) => void
  ): void {
    const stage = this.instance.getStage();
    const props = group.getAttrs() as WeaveElementAttributes;
    const absScale = group.getAbsoluteScale();
    const effectiveScale = absScale.x;

    this.textAreaSuperContainer = document.createElement('div');
    this.textAreaSuperContainer.id = `${group.id()}_label_supercontainer`;
    this.textAreaSuperContainer.style.position = 'absolute';
    this.textAreaSuperContainer.style.top = '0px';
    this.textAreaSuperContainer.style.left = '0px';
    this.textAreaSuperContainer.style.bottom = '0px';
    this.textAreaSuperContainer.style.right = '0px';
    this.textAreaSuperContainer.style.overflow = 'hidden';
    this.textAreaSuperContainer.style.pointerEvents = 'none';

    this.textAreaContainer = document.createElement('div');
    this.textAreaContainer.id = `${group.id()}_label_container`;

    this.textArea = document.createElement('textarea');
    this.textArea.id = `${group.id()}_label_textarea`;

    this.textAreaContainer.appendChild(this.textArea);
    this.textAreaSuperContainer.appendChild(this.textAreaContainer);
    stage.container().appendChild(this.textAreaSuperContainer);

    const textWidth = textBounds.width * effectiveScale;
    const fontSize =
      (props.labelFontSize ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontSize) *
      effectiveScale;

    this.textAreaContainer.style.pointerEvents = 'auto';
    this.textAreaContainer.style.position = 'absolute';
    this.textAreaContainer.style.top = `${position.y * upscaleScale}px`;
    this.textAreaContainer.style.left = `${position.x * upscaleScale}px`;
    this.textAreaContainer.style.width = `${textWidth * upscaleScale}px`;
    this.textAreaContainer.style.height = 'auto';
    this.textAreaContainer.style.overflow = 'hidden';
    this.textAreaContainer.style.display = 'flex';
    this.textAreaContainer.style.border = 'solid 2px #1e40af';
    this.textAreaContainer.style.backgroundColor = 'transparent';
    this.textAreaContainer.style.boxSizing = 'border-box';
    this.textAreaContainer.style.transformOrigin = 'left top';

    const rotation = group.getAbsoluteRotation();
    if (rotation) {
      this.textAreaContainer.style.transform = `rotate(${rotation}deg)`;
    }

    const verticalAlign =
      props.labelVerticalAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelVerticalAlign;
    this.textAreaContainer.style.alignItems =
      verticalAlign === 'top'
        ? 'start'
        : verticalAlign === 'bottom'
          ? 'end'
          : 'center';

    // Style textarea to mimic the label text
    this.textArea.value = props.labelText ?? '';
    this.textArea.style.width = '100%';
    this.textArea.style.height = 'auto';
    this.textArea.style.fontSize = `${fontSize * upscaleScale}px`;
    this.textArea.style.fontFamily =
      props.labelFontFamily ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontFamily;
    this.textArea.style.letterSpacing = `${props.labelLetterSpacing ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLetterSpacing}px`;
    this.textArea.style.lineHeight = `${props.labelLineHeight ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelLineHeight}em`;
    const fontStyle =
      props.labelFontStyle ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontStyle;
    this.textArea.style.fontStyle = fontStyle.includes('italic')
      ? 'italic'
      : 'normal';
    this.textArea.style.fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
    this.textArea.style.fontVariant =
      props.labelFontVariant ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFontVariant;
    this.textArea.style.color =
      props.labelFill ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelFill;
    this.textArea.style.textAlign =
      props.labelAlign ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelAlign;
    this.textArea.style.background = 'transparent';
    this.textArea.style.backgroundColor = 'transparent';
    this.textArea.style.border = 'none';
    this.textArea.style.outline = 'none';
    this.textArea.style.resize = 'none';
    this.textArea.style.overflow = 'hidden';
    this.textArea.style.margin = '0';
    this.textArea.style.padding = '0';
    this.textArea.style.boxSizing = 'border-box';
    this.textArea.style.caretColor = 'black';
    this.textArea.style.overscrollBehavior = 'contains';

    const resizeTextarea = () => {
      if (this.textArea && this.textAreaContainer) {
        this.textArea.style.height = 'auto';
        this.textArea.style.height = `${this.textArea.scrollHeight}px`;
        this.textAreaContainer.style.height = 'auto';
        this.textAreaContainer.style.height = `${this.textArea.scrollHeight + 4}px`;
      }
    };

    const commit = (text: string) => {
      window.removeEventListener('pointerup', handleOutsideClick);
      this.exitEditMode();
      const labelNode = group.findOne<Konva.Text>(`#${labelId(group.id())}`);
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

    // Prevent scroll on containers
    for (const el of [
      this.textAreaSuperContainer,
      this.textAreaContainer,
      this.textArea,
    ]) {
      el.addEventListener(
        'scroll',
        () => {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        },
        { signal: this.instance.getEventsController().signal }
      );
    }

    const handleOutsideClick = (e: PointerEvent) => {
      e.stopPropagation();
      if (!this.textArea) {
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
      window.addEventListener('pointerup', handleOutsideClick, {
        signal: this.instance.getEventsController().signal,
      });
    }, 0);

    this.textArea.tabIndex = 1;
    requestAnimationFrame(() => {
      this.textArea?.focus();
      resizeTextarea();
    });
  }
}
