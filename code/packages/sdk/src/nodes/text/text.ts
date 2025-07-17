// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '@/nodes/node';
import { type Vector2d } from 'konva/lib/types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { resetScale } from '@/utils';
import { WEAVE_TEXT_NODE_TYPE } from './constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { TEXT_LAYOUT } from '@/actions/text-tool/constants';
import type { WeaveTextNodeParams, WeaveTextProperties } from './types';
import type { KonvaEventObject } from 'konva/lib/Node';
import { throttle } from 'lodash';

export class WeaveTextNode extends WeaveNode {
  private config: WeaveTextProperties;
  protected nodeType: string = WEAVE_TEXT_NODE_TYPE;
  private editing: boolean = false;
  private textAreaSuperContainer: HTMLDivElement | null = null;
  private textAreaContainer: HTMLDivElement | null = null;
  private textArea: HTMLTextAreaElement | null = null;

  constructor(params?: WeaveTextNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
        ...config?.transform,
      },
    };

    this.editing = false;
    this.textArea = null;
  }

  private updateNode(nodeInstance: WeaveElementInstance) {
    const clonedText = nodeInstance.clone();
    clonedText.setAttr('triggerEditMode', undefined);
    this.instance.updateNode(this.serialize(clonedText));
    clonedText.destroy();
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const text = new Konva.Text({
      ...props,
      name: 'node',
    });

    this.setupDefaultNodeAugmentation(text);

    text.getTransformerProperties = () => {
      const stage = this.instance.getStage();
      const actualText = stage.findOne(`#${text.id()}`) as Konva.Text;

      if (actualText) {
        const attrs = actualText.getAttrs();

        if (attrs.layout === TEXT_LAYOUT.AUTO_ALL) {
          return {
            resizeEnabled: false,
            enabledAnchors: [] as string[],
          };
        }
        if (attrs.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
          return {
            resizeEnabled: true,
            enabledAnchors: ['middle-right', 'middle-left'] as string[],
          };
        }
      }

      return this.config.transform;
    };

    text.setAttrs({
      measureMultilineText: this.measureMultilineText(text),
    });

    this.setupDefaultNodeEvents(text);

    const handleTextTransform = (e: KonvaEventObject<Event, Konva.Text>) => {
      const node = e.target;

      if (this.isSelecting() && this.isNodeSelected(node)) {
        e.cancelBubble = true;
      }
    };

    text.on('transformstart', (e) => {
      this.instance.emitEvent('onTransform', e.target);
    });
    text.on('transform', throttle(handleTextTransform, 50));
    text.on('transformend', () => {
      this.instance.emitEvent('onTransform', null);
    });

    window.addEventListener('keypress', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME &&
        !this.editing &&
        e.target !== this.textArea
      ) {
        e.preventDefault();

        if (this.isSelecting() && this.isNodeSelected(text)) {
          const nodesSelectionPlugin =
            this.instance.getPlugin<WeaveNodesSelectionPlugin>(
              'nodesSelection'
            );
          if (
            nodesSelectionPlugin &&
            nodesSelectionPlugin.getSelectedNodes().length === 1 &&
            nodesSelectionPlugin.getSelectedNodes()[0].getAttrs().nodeType ===
              WEAVE_TEXT_NODE_TYPE &&
            !window.weaveTextEditing[
              nodesSelectionPlugin.getSelectedNodes()[0].id()
            ]
          ) {
            this.triggerEditMode(
              nodesSelectionPlugin.getSelectedNodes()[0] as Konva.Text
            );
          }
        }
      }
    });

    text.dblClick = () => {
      if (this.editing) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(text))) {
        return;
      }

      const stage = this.instance.getStage();

      const mousePos = stage.getPointerPosition();
      if (mousePos) {
        const elements = stage.getAllIntersections(mousePos);
        const onlyTextElements = elements.filter(
          (ele) => ele.getAttrs().nodeType === WEAVE_TEXT_NODE_TYPE
        );

        if (onlyTextElements.length > 0) {
          this.triggerEditMode(onlyTextElements[0] as Konva.Text);
        }
      }
    };

    text.on('transform', (e) => {
      if (this.isSelecting() && this.isNodeSelected(text)) {
        text.setAttrs({
          width: text.width() * text.scaleX(),
          scaleX: 1,
        });
        resetScale(text);
        text.fontSize(text.fontSize() * text.scaleY());
        this.instance.updateNode(this.serialize(text));
        e.cancelBubble = true;
      }
    });

    text.setAttr('triggerEditMode', this.triggerEditMode.bind(this));

    return text;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    let width = nextProps.width;
    let height = nextProps.height;
    if (nextProps.layout === TEXT_LAYOUT.AUTO_ALL) {
      const { width: textAreaWidth, height: textAreaHeight } =
        this.textRenderedSize(nextProps.text, nodeInstance as Konva.Text);
      width = textAreaWidth + 3.2;
      height = textAreaHeight + 3.2;
    }
    if (nextProps.layout === TEXT_LAYOUT.AUTO_HEIGHT) {
      const { height: textAreaHeight } = this.textRenderedSize(
        nextProps.text,
        nodeInstance as Konva.Text
      );
      height = textAreaHeight + 3.2;
    }

    nodeInstance.setAttrs({
      width,
      height,
    });

    if (
      nextProps.width !== nodeInstance.getAttrs().width ||
      nextProps.height !== nodeInstance.getAttrs().height
    ) {
      this.updateNode(nodeInstance);
    }

    if (this.editing) {
      this.updateTextAreaDOM(nodeInstance as Konva.Text);
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (nodesSelectionPlugin) {
      const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
      nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.triggerEditMode;
    delete cleanedAttrs.measureMultilineText;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
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
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
    ) {
      const { width: textAreaWidth } = this.textRenderedSize(
        this.textArea.value,
        textNode
      );
      this.textAreaContainer.style.width =
        textAreaWidth * textNode.getAbsoluteScale().x + 2 + 'px';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
    ) {
      this.textAreaContainer.style.height = 'auto';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
    ) {
      this.textAreaContainer.style.height = 'auto';
      this.textAreaContainer.style.height =
        this.textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().y + 'px';
    }

    this.textArea.style.height = 'auto';
    this.textArea.style.height =
      this.textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
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
    const lines = text.split('\n');
    for (const line of lines) {
      const textSize = textNode.measureSize(line);
      if (textSize.width > width) {
        width = textSize.width;
      }
      height = height + textSize.height * (textNode.lineHeight() ?? 1);
    }
    return { width, height };
  }

  private mimicTextNode(textNode: Konva.Text) {
    if (!this.textArea) {
      return;
    }

    this.textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    this.textArea.rows = textNode.text().split('\n').length;
    this.textArea.style.letterSpacing = `${textNode.letterSpacing()}`;
    this.textArea.style.opacity = `${textNode.getAttrs().opacity}`;
    this.textArea.style.lineHeight = `${textNode.lineHeight()}`;
    this.textArea.style.fontFamily = textNode.fontFamily();
    let fontWeight = 'normal';
    let fontStyle = 'normal';
    if ((textNode.fontStyle() ?? 'normal').indexOf('bold') !== -1) {
      fontWeight = 'bold';
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
  }

  private createTextAreaDOM(textNode: Konva.Text, position: Vector2d) {
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

    window.weaveTextEditing[textNode.id()] = 'editing';

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
    this.textAreaContainer.style.top = position.y + 'px';
    this.textAreaContainer.style.left = position.x + 'px';

    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
    ) {
      this.textAreaContainer.style.width = this.textArea.scrollWidth + 'px';
      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        2 +
        'px';
    }
    if (textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT) {
      this.textAreaContainer.style.width =
        (textNode.width() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
      this.textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        2 +
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
        2 +
        'px';
    }
    this.textAreaContainer.style.border = 'solid 1px #1e40af';
    this.textArea.style.position = 'absolute';
    this.textArea.style.top = '0px';
    this.textArea.style.left = '0px';
    this.textArea.style.overscrollBehavior = 'contains';
    this.textArea.style.scrollBehavior = 'auto';
    this.textArea.style.caretColor = 'black';
    this.textArea.style.width = '100%';
    this.textArea.style.minHeight = 'auto';
    this.textArea.style.margin = '0px';
    this.textArea.style.padding = '0px';
    this.textArea.style.boxSizing = 'content-box';
    this.textArea.style.overflow = 'hidden';
    this.textArea.style.background = 'transparent';
    this.textArea.style.border = 'none';
    this.textArea.style.outline = 'none';
    this.textArea.style.resize = 'none';
    this.textArea.style.backgroundColor = 'transparent';
    this.textAreaContainer.style.transformOrigin = 'left top';
    this.mimicTextNode(textNode);

    this.textArea.onfocus = () => {
      this.textAreaDomResize(textNode);
    };
    this.textArea.onkeydown = () => {
      this.textAreaDomResize(textNode);
    };
    this.textArea.onkeyup = () => {
      this.textAreaDomResize(textNode);
    };
    this.textArea.onpaste = () => {
      this.textAreaDomResize(textNode);
    };
    this.textArea.oninput = () => {
      this.textAreaDomResize(textNode);
    };
    // lock internal scroll
    this.textAreaSuperContainer.addEventListener('scroll', () => {
      if (this.textAreaSuperContainer) {
        this.textAreaSuperContainer.scrollTop = 0;
        this.textAreaSuperContainer.scrollLeft = 0;
      }
    });
    this.textAreaContainer.addEventListener('scroll', () => {
      if (!this.textAreaContainer) {
        return;
      }
      this.textAreaContainer.scrollTop = 0;
      this.textAreaContainer.scrollLeft = 0;
    });
    this.textArea.addEventListener('scroll', () => {
      if (!this.textArea) {
        return;
      }

      this.textArea.scrollTop = 0;
      this.textArea.scrollLeft = 0;
    });

    const rotation = textNode.getAbsoluteRotation();
    if (rotation) {
      const transform = 'rotate(' + rotation + 'deg)';
      this.textAreaContainer.style.transform = transform;
    }

    const measures = textNode.measureSize(textNode.text());
    const px = 0 * stage.scaleX();
    const py = measures.actualBoundingBoxDescent * stage.scaleY();
    let transform = '';
    transform += 'translateX(' + px + 'px)';
    transform += 'translateY(' + py + 'px)';

    this.textArea.style.transform = transform;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyDown = (e: any) => {
      if (this.textArea && textNode && e.key === 'Escape') {
        e.stopPropagation();
        if (
          !textNode.getAttrs().layout ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
        ) {
          const { width: textAreaWidth } = this.textRenderedSize(
            this.textArea.value,
            textNode
          );
          textNode.width(textAreaWidth + 3.2);
        }
        if (
          !textNode.getAttrs().layout ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
        ) {
          textNode.height(
            (this.textArea.scrollHeight + 1.6) *
              (1 / textNode.getAbsoluteScale().x)
          );
        }

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
        window.removeEventListener('pointerclick', handleOutsideClick);
        return;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              this.textArea.scrollHeight +
              1.6 * textNode.getAbsoluteScale().x +
              'px';
          }
        }
        this.textAreaDomResize(textNode);
      }
    };

    this.textArea.addEventListener('keydown', handleKeyDown);
    this.textArea.addEventListener('keyup', handleKeyUp);

    this.textArea.tabIndex = 1;
    this.textArea.focus();

    const handleOutsideClick = (e: Event) => {
      e.stopPropagation();

      if (!this.textArea) {
        return;
      }

      let clickedOnCanvas = false;
      if ((e.target as Element)?.id !== `${textNode.id()}`) {
        clickedOnCanvas = true;
      }

      if (clickedOnCanvas) {
        textNode.text(this.textArea.value);
        this.removeTextAreaDOM(textNode);

        this.textArea.removeEventListener('keydown', handleKeyDown);
        this.textArea.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('pointerclick', handleOutsideClick);
        window.removeEventListener('pointerdown', handleOutsideClick);

        return;
      }
    };

    setTimeout(() => {
      window.addEventListener('pointerclick', handleOutsideClick);
      window.addEventListener('pointerdown', handleOutsideClick);
    }, 0);

    this.editing = true;
  }

  private updateTextAreaDOM(textNode: Konva.Text) {
    if (!this.textAreaContainer || !this.textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const textPosition = textNode.getClientRect();
    const position: Vector2d = {
      x: textPosition.x,
      y: textPosition.y,
    };

    this.textAreaContainer.style.top = position.y + 'px';
    this.textAreaContainer.style.left = position.x + 'px';

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

    const px = 0;
    const py = -3 * stage.scaleY();
    let transform = '';
    transform += 'translateX(' + px + 'px)';
    transform += 'translateY(' + py + 'px)';

    this.textArea.style.transform = transform;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    if (this.editing) {
      textNode.visible(false);
    } else {
      textNode.visible(true);
    }
  }

  private removeTextAreaDOM(textNode: Konva.Text) {
    this.editing = false;
    const stage = this.instance.getStage();

    delete window.weaveTextEditing[textNode.id()];

    if (this.textAreaSuperContainer) {
      this.textAreaSuperContainer.remove();
    }

    textNode.visible(true);
    this.updateNode(textNode);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      const tr = selectionPlugin.getTransformer();
      if (tr) {
        tr.nodes([textNode]);
        tr.show();
      }
      this.instance.triggerAction('selectionTool');
    }

    stage.container().tabIndex = 1;
    stage.container().click();
    stage.container().focus();
  }

  private triggerEditMode(textNode: Konva.Text) {
    const stage = this.instance.getStage();

    this.editing = true;

    textNode.visible(false);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    const textPosition = textNode.absolutePosition();

    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();

    const areaPosition: Vector2d = {
      x: stageRect.x + stageContainer.offsetLeft + textPosition.x,
      y: stageRect.y + stageContainer.offsetTop + textPosition.y,
    };

    this.createTextAreaDOM(textNode, areaPosition);
  }
}
