// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '@/nodes/node';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import {
  getTopmostShadowHost,
  isInShadowDOM,
  mergeExceptArrays,
  resetScale,
} from '@/utils/utils';
import {
  TEXT_LAYOUT,
  WEAVE_STAGE_TEXT_EDITION_MODE,
  WEAVE_TEXT_NODE_DEFAULT_CONFIG,
  WEAVE_TEXT_NODE_TYPE,
} from './constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import type {
  WeaveTextNodeOnEnterTextNodeEditMode,
  WeaveTextNodeOnExitTextNodeEditMode,
  WeaveTextNodeParams,
  WeaveTextProperties,
} from './types';
import merge from 'lodash/merge';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';

export class WeaveTextNode extends WeaveNode {
  private config: WeaveTextProperties;
  protected nodeType: string = WEAVE_TEXT_NODE_TYPE;
  private createNode!: boolean;
  private editing!: boolean;
  private editingNodeId!: string | null;
  private nodeRenderedAddedRegistered!: boolean;
  private textAreaSuperContainer!: HTMLDivElement | null;
  private textAreaContainer!: HTMLDivElement | null;
  private textArea!: HTMLTextAreaElement | null;
  private keyPressHandler: ((e: KeyboardEvent) => void) | undefined;

  constructor(params?: WeaveTextNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = merge({}, WEAVE_TEXT_NODE_DEFAULT_CONFIG, config);

    this.initialize();
  }

  initialize(): void {
    this.keyPressHandler = undefined;
    this.textAreaSuperContainer = null;
    this.textAreaContainer = null;
    this.textArea = null;
    this.editing = false;
    this.editingNodeId = null;
    this.nodeRenderedAddedRegistered = false;
    this.textArea = null;
  }

  private updateNode(nodeInstance: WeaveElementInstance) {
    const actNode = this.instance
      .getStage()
      .findOne<Konva.Text>(`#${nodeInstance.id()}`);
    if (actNode) {
      const clonedText = actNode.clone();
      clonedText.setAttr('triggerEditMode', undefined);
      clonedText.setAttr('cancelEditMode', undefined);
      if (this.createNode && actNode.getAttrs().text !== '') {
        // create node if text is not empty
        const actualContainer = actNode.getParent();
        actNode.destroy();
        const serializedNode = this.serialize(clonedText);
        this.instance.addNode(serializedNode, actualContainer?.getAttrs().id);
      } else if (this.createNode && actNode.getAttrs().text === '') {
        // don't node because text is empty
        actNode.destroy();
      } else {
        // just update the node
        this.instance.updateNode(this.serialize(clonedText));
      }
      clonedText.destroy();
    }
    // Always reset the create flag: it is shared across all text nodes (single
    // handler instance) and must never leak into the next edit session, even
    // when the node could not be found above.
    this.createNode = false;
  }

  private readonly handleKeyPress = (e: KeyboardEvent) => {
    if (
      e.code === 'Enter' &&
      this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME &&
      !this.editing &&
      e.target !== this.textArea
    ) {
      e.preventDefault();

      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

      const nodeSelected: Konva.Node | null =
        selectionPlugin?.getSelectedNodes().length === 1 &&
        selectionPlugin?.getSelectedNodes()[0].getAttrs().nodeType ===
          WEAVE_TEXT_NODE_TYPE
          ? selectionPlugin?.getSelectedNodes()[0]
          : null;

      if (this.isSelecting() && nodeSelected) {
        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
        if (
          nodesSelectionPlugin &&
          nodesSelectionPlugin.getSelectedNodes().length === 1 &&
          nodesSelectionPlugin.getSelectedNodes()[0].getAttrs().nodeType ===
            WEAVE_TEXT_NODE_TYPE &&
          !this.editing
        ) {
          this.triggerEditMode(
            nodesSelectionPlugin.getSelectedNodes()[0] as Konva.Text
          );
        }
      }
    }
  };

  onAdd(): void {
    if (!this.instance.isServerSide() && !this.keyPressHandler) {
      this.keyPressHandler = this.handleKeyPress.bind(this);
      window.addEventListener('keypress', this.keyPressHandler, {
        signal: this.instance.getEventsController().signal,
      });
    }
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const text = new Konva.Text({
      ...props,
      name: 'node',
      ...(!this.config.outline.enabled && {
        strokeEnabled: false,
      }),
      ...(this.config.outline.enabled && {
        strokeEnabled: true,
        stroke: this.config.outline.color,
        strokeWidth: this.config.outline.width,
        fillAfterStrokeEnabled: true,
      }),
    });

    this.setupDefaultNodeAugmentation(text);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    text.getTransformerProperties = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.layout === TEXT_LAYOUT.SMART) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: true,
          keepRatio: false,
          enabledAnchors: [] as string[],
        };
      }
      if (actualAttrs.layout === TEXT_LAYOUT.AUTO_ALL) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: false,
          enabledAnchors: [] as string[],
        };
      }
      if (actualAttrs.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
        return {
          ...defaultTransformerProperties,
          ignoreStroke: true,
          resizeEnabled: true,
          enabledAnchors: ['middle-right', 'middle-left'] as string[],
        };
      }

      return defaultTransformerProperties;
    };

    text.allowedAnchors = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.layout === TEXT_LAYOUT.SMART) {
        return [
          'top-left',
          'top-right',
          'middle-right',
          'middle-left',
          'bottom-left',
          'bottom-right',
        ];
      }
      if (actualAttrs.layout === TEXT_LAYOUT.AUTO_ALL) {
        return [];
      }
      if (actualAttrs.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
        return ['middle-right', 'middle-left'];
      }

      return [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];
    };

    text.setAttrs({
      measureMultilineText: this.measureMultilineText(text),
    });

    this.setupDefaultNodeEvents(text, {
      performScaleReset: false,
    });

    text.dblClick = () => {
      if (this.editing) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(text))) {
        return;
      }

      this.triggerEditMode(text as Konva.Text);
    };

    text.setAttr('triggerEditMode', this.triggerEditMode.bind(this));

    let actualAnchor: string | null | undefined = undefined;

    text.on('transformstart', (e) => {
      const isCtrlOrMetaPressed = e.evt.ctrlKey || e.evt.metaKey;

      this.instance.emitEvent('onTransform', e.target);

      actualAnchor = this.getNodesSelectionPlugin()
        ?.getTransformer()
        ?.getActiveAnchor();

      if (
        (text.getAttrs().layout === TEXT_LAYOUT.SMART &&
          ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
            actualAnchor ?? ''
          )) ||
        (text.getAttrs().layout === TEXT_LAYOUT.FIXED && isCtrlOrMetaPressed)
      ) {
        this.getNodesSelectionPlugin()?.getTransformer()?.keepRatio(true);
      } else {
        this.getNodesSelectionPlugin()?.getTransformer()?.keepRatio(false);
      }

      if (
        [TEXT_LAYOUT.AUTO_HEIGHT, TEXT_LAYOUT.SMART].includes(
          text.getAttrs().layout
        ) &&
        ['middle-right', 'middle-left'].includes(actualAnchor ?? '')
      ) {
        text.wrap('word');
        text.scaleY(1);
        text.height(undefined);
      }

      e.cancelBubble = true;
    });

    const handleTextTransform = () => {
      if (
        [TEXT_LAYOUT.AUTO_HEIGHT, TEXT_LAYOUT.SMART].includes(
          text.getAttrs().layout
        ) &&
        ['middle-right', 'middle-left'].includes(actualAnchor ?? '')
      ) {
        text.width(text.width() * text.scaleX());
        text.scaleX(1);
        text.scaleY(1);
        text.height(undefined);
        text.getLayer()?.batchDraw();
      }

      if (
        (this.isSelecting() &&
          this.isNodeSelected(text) &&
          ![TEXT_LAYOUT.SMART].includes(text.getAttrs().layout)) ||
        (this.isSelecting() &&
          this.isNodeSelected(text) &&
          [TEXT_LAYOUT.SMART].includes(text.getAttrs().layout) &&
          !['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
            actualAnchor ?? ''
          ))
      ) {
        text.width(text.width() * text.scaleX());
        resetScale(text);
        text.fontSize(text.fontSize() * text.scaleY());
      }

      text.setAttr('shouldUpdateOnTransform', false);

      text.getLayer()?.batchDraw();
    };

    text.on('transform', handleTextTransform);

    const handleTransformEnd = () => {
      this.instance.emitEvent('onTransform', null);

      let definedSmartWidth = false;

      let smartFixedWidth = text.getAttr('smartFixedWidth') ?? false;

      if (
        ![TEXT_LAYOUT.SMART].includes(text.getAttrs().layout) &&
        !['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
          actualAnchor ?? ''
        )
      ) {
        this.scaleReset(text);
      }

      if (
        [TEXT_LAYOUT.SMART].includes(text.getAttrs().layout) &&
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
          actualAnchor ?? ''
        )
      ) {
        text.setAttrs({
          width: Math.ceil(text.width() * text.scaleX()),
          height: Math.ceil(text.height() * text.scaleY()),
          fontSize: text.fontSize() * text.scaleY(),
          scaleX: 1,
          scaleY: 1,
        });
      }

      if (
        [TEXT_LAYOUT.AUTO_HEIGHT, TEXT_LAYOUT.SMART].includes(
          text.getAttrs().layout
        ) &&
        ['middle-right', 'middle-left'].includes(actualAnchor ?? '') &&
        !smartFixedWidth &&
        !definedSmartWidth
      ) {
        text.setAttr('smartFixedWidth', true);
        smartFixedWidth = true;
        definedSmartWidth = true;
        text.width(Math.ceil(text.width() * text.scaleX()));
        text.scaleX(1);
        text.scaleY(1);
        text.height(undefined);
        text.getLayer()?.batchDraw();
        text.height(Math.ceil(text.height()));
      }

      if (
        [TEXT_LAYOUT.SMART].includes(text.getAttrs().layout) &&
        ['middle-right', 'middle-left'].includes(actualAnchor ?? '') &&
        smartFixedWidth &&
        !definedSmartWidth
      ) {
        text.width(Math.ceil(text.width() * text.scaleX()));
        text.scaleX(1);
      }

      this.instance.updateNode(this.serialize(text));
    };

    text.on('transformend', () => {
      handleTransformEnd();
    });

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

    if (!this.instance.isServerSide() && !this.keyPressHandler) {
      this.keyPressHandler = this.handleKeyPress.bind(this);
      window.addEventListener('keypress', this.keyPressHandler, {
        signal: this.instance.getEventsController().signal,
      });
    }

    return text;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
      ...(!this.config.outline.enabled && {
        strokeEnabled: false,
      }),
      ...(this.config.outline.enabled && {
        strokeEnabled: true,
        stroke: this.config.outline.color,
        strokeWidth: this.config.outline.width,
        fillAfterStrokeEnabled: true,
      }),
    });

    let width = nextProps.width;
    let height = nextProps.height;
    if (nextProps.layout === TEXT_LAYOUT.AUTO_ALL) {
      const { width: textAreaWidth, height: textAreaHeight } =
        this.textRenderedSize(nextProps.text, nodeInstance as Konva.Text);
      width = (textAreaWidth + 2) * nodeInstance.getAbsoluteScale().x;
      height = (textAreaHeight + 2) * nodeInstance.getAbsoluteScale().x;
    }
    if (nextProps.layout === TEXT_LAYOUT.SMART && !nextProps.smartFixedWidth) {
      const { width: textAreaWidth } = this.textRenderedSize(
        nextProps.text,
        nodeInstance as Konva.Text
      );
      width = textAreaWidth / this.instance.getStage().scaleX();
      height = undefined;
    }
    if (nextProps.layout === TEXT_LAYOUT.SMART && nextProps.smartFixedWidth) {
      height = undefined;
    }
    if (nextProps.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
      height = undefined;
    }

    nodeInstance.setAttrs({
      width,
      height,
    });

    // Only drive the edit overlay from updates that belong to the node actually
    // being edited. The handler is shared across every text node, so an update
    // for a *different* text node (e.g. a previously-selected one) must never
    // hijack the textarea or toggle that node's visibility.
    if (this.editing && this.editingNodeId === nodeInstance.id()) {
      this.updateTextAreaDOM(nodeInstance as Konva.Text);
    }

    if (!this.editing) {
      const nodesSelectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (nodesSelectionPlugin) {
        const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
        nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
      }
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.triggerEditMode;
    delete cleanedAttrs.cancelEditMode;
    delete cleanedAttrs.measureMultilineText;
    delete cleanedAttrs.overridesMouseControl;
    delete cleanedAttrs.shouldUpdateOnTransform;
    delete cleanedAttrs.dragBoundFunc;

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

  private onZoomChangeHandler = (textNode: Konva.Text) => () => {
    if (!this.editing) {
      return;
    }

    this.updateTextAreaDOM(textNode);
  };

  private onStageMoveHandler = (textNode: Konva.Text) => () => {
    if (!this.editing) {
      return;
    }

    this.updateTextAreaDOM(textNode);
  };

  private textAreaDomResize(textNode: Konva.Text) {
    if (!this.textArea || !this.textAreaContainer) {
      return;
    }

    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
      (textNode.getAttrs().layout === TEXT_LAYOUT.SMART &&
        !textNode.getAttrs().smartFixedWidth)
    ) {
      const { width: textAreaWidth } = this.textRenderedSize(
        this.textArea.value,
        textNode
      );
      const borderSize = this.config.edition.borderSize;
      const width =
        ((textAreaWidth + borderSize * 2) * textNode.getAbsoluteScale().x) /
        this.instance.getStage().scaleX();
      this.textAreaContainer.style.width = width + 'px';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT ||
      textNode.getAttrs().layout === TEXT_LAYOUT.SMART
    ) {
      this.textAreaContainer.style.height = 'auto';
      const height = this.textArea.scrollHeight + textNode.getAbsoluteScale().y;
      this.textAreaContainer.style.height = height + 'px';
    }

    this.textArea.style.height = 'auto';
    const height = this.textArea.scrollHeight + textNode.getAbsoluteScale().y;
    this.textArea.style.height = height + 'px';
    this.textArea.rows = this.textArea.value.split('\n').length;
  }

  measureMultilineText(
    textNode: Konva.Text
  ): () => { width: number; height: number } {
    return () => {
      return this.textRenderedSize(textNode.text(), textNode as Konva.Text);
    };
  }

  textRenderedSize(
    text: string,
    textNode: Konva.Text
  ): { width: number; height: number } {
    let width = 0;
    let height = 0;

    if (!text) {
      return { width: 1, height: 1 };
    }

    const lines = text.split('\n');
    for (const line of lines) {
      const textSize = textNode.measureSize(line);
      if (textSize.width > width) {
        width = textSize.width;
      }
      height = height + textSize.height * (textNode.lineHeight() ?? 1);
    }

    return {
      width: width * this.instance.getStage().scaleX() * 1.01,
      height: height * this.instance.getStage().scaleX() * 1.01,
    };
  }

  private mimicTextNode(textNode: Konva.Text) {
    if (!this.textArea) {
      return;
    }

    this.textArea.style.caretColor = this.config.cursor.color;
    this.textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    this.textArea.rows = textNode.text().split('\n').length;
    this.textArea.style.letterSpacing = `${textNode.letterSpacing()}`;
    this.textArea.style.opacity = `${textNode.getAttrs().opacity}`;
    this.textArea.style.lineHeight = `${textNode.lineHeight()}em`;
    this.textArea.style.fontFamily = textNode.fontFamily();
    let fontWeight: string = 'normal';
    let fontStyle: string = 'normal';
    const matchNumber = textNode.fontStyle().match(/\d+/);
    if ((textNode.fontStyle() ?? 'normal').indexOf('bold') !== -1) {
      fontWeight = 'bold';
    }
    if (matchNumber) {
      fontWeight = matchNumber[0].toString();
    }
    if ((textNode.fontStyle() ?? 'normal').indexOf('italic') !== -1) {
      fontStyle = 'italic';
    }
    this.textArea.style.fontWeight = fontWeight;
    this.textArea.style.backgroundColor = 'transparent';
    this.textArea.style.fontStyle = fontStyle;
    this.textArea.style.fontVariant = textNode.fontVariant();
    this.textArea.style.textDecoration = textNode.textDecoration();
    this.textArea.style.textAlign = textNode.align();
    this.textArea.style.color = `${textNode.fill()}`;
    if (this.config.outline.enabled) {
      this.textArea.style.paintOrder = 'stroke fill';
      this.textArea.style.webkitTextStroke = `${
        this.config.outline.width * this.instance.getStage().scaleX()
      }px ${this.config.outline.color}`;
    }
  }

  private createTextAreaDOM(textNode: Konva.Text, position: Konva.Vector2d) {
    const stage = this.instance.getStage();

    // create textarea and style it
    this.textAreaSuperContainer = document.createElement('div');
    this.textAreaSuperContainer.id = `${textNode.id()}_supercontainer`;
    this.textAreaSuperContainer.style.position = 'absolute';
    this.textAreaSuperContainer.style.top = '0px';
    this.textAreaSuperContainer.style.left = '0px';
    this.textAreaSuperContainer.style.bottom = '0px';
    this.textAreaSuperContainer.style.right = '0px';
    this.textAreaSuperContainer.style.overflow = 'hidden';
    this.textAreaSuperContainer.style.pointerEvents = 'none';

    this.textAreaContainer = document.createElement('div');
    this.textAreaContainer.id = `${textNode.id()}_container`;
    this.textArea = document.createElement('textarea');
    this.textArea.id = textNode.id();
    this.textAreaContainer.appendChild(this.textArea);
    this.textAreaSuperContainer.appendChild(this.textAreaContainer);
    stage.container().appendChild(this.textAreaSuperContainer);
    this.textAreaContainer.style.pointerEvents = 'auto';
    this.textAreaContainer.style.backgroundColor = 'transparent';
    this.textArea.style.pointerEvents = 'auto';

    this.instance.addEventListener(
      'onZoomChange',
      this.onZoomChangeHandler(textNode).bind(this)
    );
    this.instance.addEventListener(
      'onStageMove',
      this.onStageMoveHandler(textNode).bind(this)
    );

    const upscaleScale = stage.getAttr('upscaleScale');

    // apply many styles to match text on canvas as close as possible
    // remember that text rendering on canvas and on the textarea can be different
    // and sometimes it is hard to make it 100% the same. But we will try...
    this.textArea.value = textNode.text();
    this.textArea.id = textNode.id();
    this.textAreaContainer.style.overflow = 'hidden';
    this.textAreaContainer.style.display = 'flex';
    this.textAreaContainer.style.justifyContent = 'start';
    if (textNode.getAttrs().verticalAlign === 'top') {
      this.textAreaContainer.style.alignItems = 'start';
    }
    if (textNode.getAttrs().verticalAlign === 'middle') {
      this.textAreaContainer.style.alignItems = 'center';
    }
    if (textNode.getAttrs().verticalAlign === 'bottom') {
      this.textAreaContainer.style.alignItems = 'end';
    }
    this.textAreaContainer.style.position = 'absolute';
    this.textAreaContainer.style.top = position.y * upscaleScale + 'px';
    this.textAreaContainer.style.left = position.x * upscaleScale + 'px';

    if (
      textNode.getAttrs().layout === TEXT_LAYOUT.SMART &&
      !textNode.getAttrs().smartFixedWidth
    ) {
      const borderSize = this.config.edition.borderSize;
      const rect = textNode.getClientRect({ relativeTo: stage });
      this.textAreaContainer.style.width =
        (rect.width + borderSize * 2) * textNode.getAbsoluteScale().x + 'px';
      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
    ) {
      const borderSize = this.config.edition.borderSize;
      const rect = textNode.getClientRect({ relativeTo: stage });
      this.textAreaContainer.style.width =
        (rect.width + borderSize * 2) * textNode.getAbsoluteScale().x + 'px';
      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
    }
    if (
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT ||
      (textNode.getAttrs().layout === TEXT_LAYOUT.SMART &&
        textNode.getAttrs().smartFixedWidth)
    ) {
      const rect = textNode.getClientRect({ relativeTo: stage });
      this.textAreaContainer.style.width =
        (rect.width + 10) * textNode.getAbsoluteScale().x + 'px';

      if (textNode.getAttrs().smartFixedWidth) {
        this.textAreaContainer.style.width =
          (textNode.width() - textNode.padding() * 2) *
            textNode.getAbsoluteScale().x +
          'px';
      }

      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
    }
    if (textNode.getAttrs().layout === TEXT_LAYOUT.FIXED) {
      this.textAreaContainer.style.width =
        (textNode.width() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
    }

    const size = this.textRenderedSize(textNode.text(), textNode);

    const borderSize = this.config.edition.borderSize;
    this.textAreaContainer.style.border = `solid ${borderSize}px #1e40af`;
    this.textArea.style.position = 'absolute';
    this.textArea.style.top = '0px';
    this.textArea.style.left = '0px';
    this.textArea.style.lineHeight = '1em';
    this.textArea.style.overscrollBehavior = 'contains';
    this.textArea.style.scrollBehavior = 'auto';
    this.textArea.style.caretColor = 'black';
    this.textArea.style.width = '100%';
    this.textArea.style.height = `${size.height}px`;
    this.textArea.style.minHeight = 'auto';
    this.textArea.style.margin = '0px';
    this.textArea.style.padding = '0px';
    this.textArea.style.paddingTop = '0px';
    this.textArea.style.boxSizing = 'content-box';
    this.textArea.style.overflow = 'hidden';
    this.textArea.style.background = 'transparent';
    this.textArea.style.border = 'none';
    this.textArea.style.outline = 'none';
    this.textArea.style.resize = 'none';
    this.textArea.style.overflow = 'hidden';
    if (this.config.outline.enabled) {
      this.textArea.style.paintOrder = 'stroke fill';
      this.textArea.style.webkitTextStroke = `${
        this.config.outline.width * this.instance.getStage().scaleX()
      }px ${this.config.outline.color}`;
    }
    this.textArea.style.backgroundColor = 'transparent';
    this.textAreaContainer.style.transformOrigin = 'left top';
    this.mimicTextNode(textNode);

    this.textArea.style.left = `${-borderSize}px`;
    this.textArea.style.top = `${
      -borderSize + (size.height - this.textArea.offsetHeight)
    }px`;

    this.textArea.onfocus = () => {
      this.textAreaDomResize(textNode);
    };
    this.textArea.onkeydown = (e) => {
      e.stopPropagation();
      this.textAreaDomResize(textNode);
    };
    this.textArea.onkeyup = (e) => {
      e.stopPropagation();
      this.textAreaDomResize(textNode);
    };
    this.textArea.onpaste = () => {
      this.textAreaDomResize(textNode);
      // throttledUpdateTextNode();
    };
    this.textArea.oninput = () => {
      this.textAreaDomResize(textNode);
      // throttledUpdateTextNode();
    };
    // lock internal scroll
    this.textAreaSuperContainer.addEventListener(
      'scroll',
      () => {
        if (this.textAreaSuperContainer) {
          this.textAreaSuperContainer.scrollTop = 0;
          this.textAreaSuperContainer.scrollLeft = 0;
        }
      },
      { signal: this.instance.getEventsController().signal }
    );
    this.textAreaContainer.addEventListener(
      'scroll',
      () => {
        if (!this.textAreaContainer) {
          return;
        }
        this.textAreaContainer.scrollTop = 0;
        this.textAreaContainer.scrollLeft = 0;
      },
      { signal: this.instance.getEventsController().signal }
    );
    this.textArea.addEventListener(
      'scroll',
      () => {
        if (!this.textArea) {
          return;
        }

        this.textArea.scrollTop = 0;
        this.textArea.scrollLeft = 0;
      },
      { signal: this.instance.getEventsController().signal }
    );

    const rotation = textNode.getAbsoluteRotation();
    if (rotation) {
      const transform = 'rotate(' + rotation + 'deg)';
      this.textAreaContainer.style.transform = transform;
    }

    const updateTextNodeSize = () => {
      if (!this.textArea) {
        return;
      }

      if (
        !textNode.getAttrs().layout ||
        textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
        (textNode.getAttrs().layout === TEXT_LAYOUT.SMART &&
          !textNode.getAttrs().smartFixedWidth)
      ) {
        const { width: textAreaWidth } = this.textRenderedSize(
          this.textArea.value,
          textNode
        );

        const width = textAreaWidth / this.instance.getStage().scaleX();
        textNode.width(width);
      }
      if (
        !textNode.getAttrs().layout ||
        textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT ||
        textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
        textNode.getAttrs().layout === TEXT_LAYOUT.SMART
      ) {
        const size = this.textRenderedSize(this.textArea.value, textNode);
        textNode.height(size.height * (1 / textNode.getAbsoluteScale().x));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (this.textArea && textNode && e.code === 'Escape') {
        e.stopPropagation();

        updateTextNodeSize();
        textNode.text(this.textArea.value);
        this.removeTextAreaDOM(textNode);
        this.instance.removeEventListener(
          'onZoomChange',
          this.onZoomChangeHandler(textNode).bind(this)
        );
        this.instance.removeEventListener(
          'onStageMove',
          this.onStageMoveHandler(textNode).bind(this)
        );
        window.removeEventListener('pointerup', handleOutsideClick);
        window.removeEventListener('pointerdown', handleOutsideClick);
        return;
      }
    };

    const cancelEditMode = () => {
      textNode.setAttr('cancelEditMode', undefined);
      this.removeTextAreaDOM(textNode);
      this.instance.removeEventListener(
        'onZoomChange',
        this.onZoomChangeHandler(textNode).bind(this)
      );
      this.instance.removeEventListener(
        'onStageMove',
        this.onStageMoveHandler(textNode).bind(this)
      );
      window.removeEventListener('pointerup', handleOutsideClick);
      window.removeEventListener('pointerdown', handleOutsideClick);
    };

    textNode.setAttr('cancelEditMode', cancelEditMode.bind(this));

    const handleKeyUp = () => {
      if (!this.textArea) {
        return;
      }

      textNode.text(this.textArea.value);
      if (this.textArea && textNode) {
        if (
          !textNode.getAttrs().layout ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
        ) {
          if (this.textAreaContainer) {
            this.textAreaContainer.style.height = 'auto';
            this.textAreaContainer.style.height =
              this.textArea.scrollHeight + textNode.getAbsoluteScale().x + 'px';
          }
        }
        this.textAreaDomResize(textNode);
      }
    };

    this.textArea.addEventListener('keydown', handleKeyDown, {
      signal: this.instance.getEventsController().signal,
    });
    this.textArea.addEventListener('keyup', handleKeyUp, {
      signal: this.instance.getEventsController().signal,
    });

    this.textArea.tabIndex = 1;
    this.textArea.focus();

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

      let clickedOnCanvas = false;
      if ((elementUnderMouse as Element)?.id !== `${textNode.id()}`) {
        clickedOnCanvas = true;
      }

      if (clickedOnCanvas) {
        updateTextNodeSize();
        textNode.text(this.textArea.value);
        this.removeTextAreaDOM(textNode);

        this.textArea.removeEventListener('keydown', handleKeyDown);
        this.textArea.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('pointerup', handleOutsideClick);

        return;
      }
    };

    setTimeout(() => {
      window.addEventListener('pointerup', handleOutsideClick, {
        signal: this.instance.getEventsController().signal,
      });
    }, 0);

    this.instance.getStage().mode(WEAVE_STAGE_TEXT_EDITION_MODE);

    this.editing = true;
  }

  private updateTextAreaDOM(textNode: Konva.Text) {
    if (!this.textAreaContainer || !this.textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const upscaleScale = stage.getAttr('upscaleScale');

    const textPosition = textNode.absolutePosition();
    const position: Konva.Vector2d = {
      x: textPosition.x,
      y: textPosition.y,
    };

    this.textAreaContainer.style.top = position.y * upscaleScale + 'px';
    this.textAreaContainer.style.left = position.x * upscaleScale + 'px';

    if (textNode.getAttrs().verticalAlign === 'top') {
      this.textAreaContainer.style.alignItems = 'start';
    }
    if (textNode.getAttrs().verticalAlign === 'middle') {
      this.textAreaContainer.style.alignItems = 'center';
    }
    if (textNode.getAttrs().verticalAlign === 'bottom') {
      this.textAreaContainer.style.alignItems = 'end';
    }
    this.mimicTextNode(textNode);

    this.textAreaDomResize(textNode);
    // call twice for side-effect
    this.textAreaDomResize(textNode);

    const rotation = textNode.getAbsoluteRotation();
    if (rotation) {
      const transform = 'rotate(' + rotation + 'deg)';
      this.textAreaContainer.style.transform = transform;
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    // Guard the hide against the shared handler: only the node under edit may be
    // hidden behind the textarea overlay. Without the id check a stray call for
    // another text node would hide it locally with no way to restore it (the
    // shared state stays visible, so it only reappears after a reload).
    if (this.editing && this.editingNodeId === textNode.id()) {
      textNode.visible(false);
    } else {
      textNode.visible(true);
    }
  }

  private removeTextAreaDOM(textNode: Konva.Text) {
    this.instance.releaseMutexLock();

    this.instance.getStage().mode(WEAVE_STAGE_DEFAULT_MODE);

    this.editing = false;
    this.editingNodeId = null;
    const stage = this.instance.getStage();

    if (this.textAreaSuperContainer) {
      this.textAreaSuperContainer.remove();
    }

    textNode.visible(true);
    this.updateNode(textNode);

    // For a freshly-created node, updateNode() destroys `textNode` and re-adds
    // it through addNode(), producing a brand-new Konva instance. Re-resolve the
    // live node by id so the transformer never attaches to a destroyed node.
    const liveNode = stage.findOne<Konva.Text>(`#${textNode.id()}`) ?? textNode;

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

    this.instance.emitEvent<WeaveTextNodeOnExitTextNodeEditMode>(
      'onExitTextNodeEditMode',
      { node: liveNode }
    );
  }

  private triggerEditMode(textNode: Konva.Text, create = false) {
    if (create) {
      this.createNode = true;
    }

    const lockAcquired = this.instance.setMutexLock({
      nodeIds: [textNode.id()],
      operation: 'text-edit',
    });

    if (!lockAcquired) {
      return;
    }

    this.editing = true;
    this.editingNodeId = textNode.id();

    textNode.visible(false);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    const textPosition = textNode.absolutePosition();

    const areaPosition: Konva.Vector2d = {
      x: textPosition.x,
      y: textPosition.y,
    };

    this.createTextAreaDOM(textNode, areaPosition);

    this.instance.emitEvent<WeaveTextNodeOnEnterTextNodeEditMode>(
      'onEnterTextNodeEditMode',
      { node: textNode }
    );
  }

  onDestroyInstance(): void {
    super.onDestroyInstance();
    if (!this.instance.isServerSide() && this.keyPressHandler) {
      window.removeEventListener('keypress', this.keyPressHandler);
      this.keyPressHandler = undefined;
    }
  }

  resetSmartLayout(textNode: Konva.Text) {
    textNode.setAttr('smartFixedWidth', undefined);
    const { width: textAreaWidth } = this.textRenderedSize(
      textNode.text(),
      textNode
    );
    textNode.width(textAreaWidth);

    this.instance.updateNode(this.serialize(textNode));
  }

  static defaultState<WeaveTextProperties>(
    nodeId: string,
    params?: { config: WeaveTextProperties }
  ): WeaveStateElement {
    const config = merge(
      {},
      WEAVE_TEXT_NODE_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    return {
      ...super.defaultState(nodeId),
      type: WEAVE_TEXT_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: 'text',
        fontFamily: 'Arial',
        fontSize: 32,
        fontStyle: 'normal',
        fontVariant: 'normal',
        textDecoration: 'none',
        letterSpacing: 0,
        lineHeight: 1,
        align: 'left',
        verticalAlign: 'top',
        fill: '#000000ff',
        text: 'This is a text node',
        layout: TEXT_LAYOUT.SMART,
        ...(!config.outline.enabled && {
          strokeEnabled: false,
        }),
        ...(config.outline.enabled && {
          strokeEnabled: true,
          stroke: config.outline.color,
          strokeWidth: config.outline.width,
          fillAfterStrokeEnabled: true,
        }),
      },
    };
  }

  static addNodeState(
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(defaultNodeState, {
      props: {
        x: props.x,
        y: props.y,
        width: props.width,
        ...(props.height && { height: props.height }),
        FontFamily: props.fontFamily,
        fontSize: props.fontSize,
        fontStyle: props.fontStyle,
        fontVariant: props.fontVariant,
        textDecoration: props.textDecoration,
        letterSpacing: props.letterSpacing,
        lineHeight: props.lineHeight,
        align: props.align,
        verticalAlign: props.verticalAlign,
        rotation: props.rotation,
        fill: props.fill,
        text: props.text,
        layout: props.layout,
        ...(props.strokeEnabled && { strokeEnabled: props.strokeEnabled }),
        ...(props.stroke && { stroke: props.stroke }),
        ...(props.strokeWidth && { strokeWidth: props.strokeWidth }),
        ...(props.fillAfterStrokeEnabled && {
          fillAfterStrokeEnabled: props.fillAfterStrokeEnabled,
        }),
      },
    });
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(prevNodeState, {
      props: {
        x: nextProps.x,
        y: nextProps.y,
        width: nextProps.width,
        ...(nextProps.height && { height: nextProps.height }),
        FontFamily: nextProps.fontFamily,
        fontSize: nextProps.fontSize,
        fontStyle: nextProps.fontStyle,
        fontVariant: nextProps.fontVariant,
        textDecoration: nextProps.textDecoration,
        letterSpacing: nextProps.letterSpacing,
        lineHeight: nextProps.lineHeight,
        align: nextProps.align,
        verticalAlign: nextProps.verticalAlign,
        rotation: nextProps.rotation,
        fill: nextProps.fill,
        text: nextProps.text,
        layout: nextProps.layout,
        ...(nextProps.strokeEnabled && {
          strokeEnabled: nextProps.strokeEnabled,
        }),
        ...(nextProps.stroke && { stroke: nextProps.stroke }),
        ...(nextProps.strokeWidth && { strokeWidth: nextProps.strokeWidth }),
        ...(nextProps.fillAfterStrokeEnabled && {
          fillAfterStrokeEnabled: nextProps.fillAfterStrokeEnabled,
        }),
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_TEXT_NODE_TYPE)
        .describe(
          `Type of the node, for a text node it will always be "${WEAVE_TEXT_NODE_TYPE}"`
        ),
      props: z.object({
        nodeType: z
          .literal(WEAVE_TEXT_NODE_TYPE)
          .describe(
            `Type of the node, for a text node it will always be "${WEAVE_TEXT_NODE_TYPE}"`
          ),

        width: z.number().describe('Width of the text in pixels'),
        height: z
          .number()
          .optional()
          .describe(
            'Height of the text in pixels. Optional if layout is auto-height or smart.'
          ),

        fontFamily: z
          .string()
          .default('Arial')
          .describe('Font family of the text, e.g. Arial, Helvetica, etc.'),
        fontSize: z
          .number()
          .default(16)
          .describe('Font size of the text in pixels.'),
        fontStyle: z
          .string()
          .regex(/^(?:normal|bold|\d+)(?: italic)?$/)
          .default('normal')
          .describe(
            'Font style of the text, can be "normal", "bold", "400", "italic" or a combination like "bold italic" or "700 italic".'
          ),
        fontVariant: z
          .enum(['normal', 'small-caps'])
          .describe(
            'Font variant of the text, can be "normal" or "small-caps".'
          ),
        textDecoration: z
          .enum(['line-through', 'underline', ''])
          .default('')
          .describe(
            'Text decoration can be "line-through", "underline" or empty string for none.'
          ),
        letterSpacing: z
          .number()
          .default(0)
          .describe('Spacing between letters in pixels.'),
        lineHeight: z
          .number()
          .default(1)
          .describe('Line height of the text, as a multiplier of font size.'),
        align: z
          .enum(['left', 'center', 'right', 'justify'])
          .default('left')
          .describe(
            'Text alignment, can be "left", "center", "right" or "justify".'
          ),
        verticalAlign: z
          .enum(['top', 'middle', 'bottom'])
          .default('top')
          .describe(
            "Vertical alignment of the text, can be 'top', 'middle' or 'bottom'."
          ),

        fill: z
          .string()
          .default('#000000ff')
          .describe(
            'Fill color of the text  in hex format with alpha channel (e.g. #RRGGBBAA).'
          ),

        text: z
          .string()
          .default('text')
          .describe('The actual text content of the node.'),

        strokeEnabled: z
          .boolean()
          .default(false)
          .describe('Whether the text outline is enabled.'),
        stroke: z
          .string()
          .optional()
          .default('#d6d6d6')
          .describe(
            'Color of the text outline in hex format with alpha channel (e.g. #RRGGBBAA).'
          ),
        strokeWidth: z
          .number()
          .optional()
          .default(2)
          .describe('Width of the text outline in pixels.'),
        strokeScaleEnabled: z
          .boolean()
          .default(true)
          .describe(
            'Whether the stroke width should scale when the node is scaled.'
          ),
        fillAfterStrokeEnabled: z
          .boolean()
          .default(true)
          .describe(
            'Whether the fill should be drawn after the stroke. If false, the stroke will be drawn on top of the fill.'
          ),

        layout: z
          .enum(TEXT_LAYOUT)
          .default(TEXT_LAYOUT.SMART)
          .describe(
            "Layout mode of the text node. Can be:\n- 'fixed': the text node will have fixed width and height, and the text will be scaled to fit the node.\n- 'auto-height': the width of the text node will be fixed, but the height will adjust to fit the text content.\n- 'auto-all': both width and height of the text node will adjust to fit the text content.\n- 'smart': the text node will try to adjust its size based on the content and layout, but it will not exceed the initial width and height set on the node."
          ),
      }),
    });

    return nodeSchema;
  }
}
