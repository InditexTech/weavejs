// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
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

export class WeaveTextNode extends WeaveNode {
  protected nodeType: string = WEAVE_TEXT_NODE_TYPE;
  private editing: boolean = false;

  constructor() {
    super();

    this.editing = false;
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

    text.setAttrs({
      measureMultilineText: this.measureMultilineText(text),
    });

    this.setupDefaultNodeEvents(text);

    text.on('transform', (e) => {
      const node = e.target;

      if (this.isSelecting() && this.isNodeSelected(node)) {
        const nodeHandler =
          this.instance.getNodeHandler<WeaveNode>(WEAVE_TEXT_NODE_TYPE);
        const serializedNode = nodeHandler.serialize(
          node as WeaveElementInstance
        );
        this.instance.updateNode({
          ...serializedNode,
          props: {
            ...serializedNode.props,
            layout: TEXT_LAYOUT.FIXED,
          },
        });
        e.cancelBubble = true;
      }
    });

    window.addEventListener('keypress', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME &&
        !this.editing
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
            e.preventDefault();
            this.triggerEditMode(
              nodesSelectionPlugin.getSelectedNodes()[0] as Konva.Text
            );
          }
        }
      }
    });

    text.on('dblclick dbltap', (e) => {
      e.cancelBubble = true;

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
    });

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

  private textAreaDomResize(
    textAreaContainer: HTMLDivElement,
    textArea: HTMLTextAreaElement,
    textNode: Konva.Text
  ) {
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
    ) {
      const { width: textAreaWidth } = this.textRenderedSize(
        textArea.value,
        textNode
      );
      textAreaContainer.style.width =
        (textAreaWidth + 5) * textNode.getAbsoluteScale().x + 'px';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
    ) {
      textAreaContainer.style.height = 'auto';
    }
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
    ) {
      textAreaContainer.style.height = 'auto';
      textAreaContainer.style.height =
        textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().y + 'px';
    }

    textArea.style.height = 'auto';
    textArea.style.height =
      textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
    textArea.rows = textArea.value.split('\n').length;
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

  private createTextAreaDOM(textNode: Konva.Text, position: Vector2d) {
    const stage = this.instance.getStage();

    // create textarea and style it
    const textAreaSuperContainer = document.createElement('div');
    textAreaSuperContainer.id = `${textNode.id()}_supercontainer`;
    textAreaSuperContainer.style.position = 'absolute';
    textAreaSuperContainer.style.top = '0px';
    textAreaSuperContainer.style.left = '0px';
    textAreaSuperContainer.style.bottom = '0px';
    textAreaSuperContainer.style.right = '0px';
    textAreaSuperContainer.style.overflow = 'hidden';

    const textAreaContainer = document.createElement('div');
    textAreaContainer.id = `${textNode.id()}_container`;
    const textArea = document.createElement('textarea');
    textArea.id = textNode.id();
    textAreaContainer.appendChild(textArea);
    textAreaSuperContainer.appendChild(textAreaContainer);
    stage.container().appendChild(textAreaSuperContainer);

    const containerRect = stage.container().getBoundingClientRect();

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
    textArea.value = textNode.text();
    textArea.id = textNode.id();
    textAreaContainer.style.overflow = 'hidden';
    textAreaContainer.style.display = 'flex';
    textAreaContainer.style.justifyContent = 'start';
    if (textNode.getAttrs().verticalAlign === 'top') {
      textAreaContainer.style.alignItems = 'start';
    }
    if (textNode.getAttrs().verticalAlign === 'middle') {
      textAreaContainer.style.alignItems = 'center';
    }
    if (textNode.getAttrs().verticalAlign === 'bottom') {
      textAreaContainer.style.alignItems = 'end';
    }
    textAreaContainer.style.position = 'absolute';
    textAreaContainer.style.top = -containerRect.y + position.y + 'px';
    textAreaContainer.style.left = -containerRect.x + position.x + 'px';
    if (
      !textNode.getAttrs().layout ||
      textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
    ) {
      textAreaContainer.style.width = textArea.scrollWidth + 'px';
      textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        2 +
        'px';
    }
    if (textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT) {
      textAreaContainer.style.width =
        (textNode.width() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
      textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        2 +
        'px';
    }
    if (textNode.getAttrs().layout === TEXT_LAYOUT.FIXED) {
      textAreaContainer.style.width =
        (textNode.width() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        'px';
      textAreaContainer.style.height =
        (textNode.height() - textNode.padding() * 2) *
          textNode.getAbsoluteScale().x +
        2 +
        'px';
    }
    textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    textArea.rows = textNode.text().split('\n').length;
    textAreaContainer.style.border = 'solid 1px #1e40af';
    textArea.style.caretColor = 'black';
    textArea.style.width = '100%';
    textArea.style.minHeight = 'auto';
    textArea.style.margin = '0px';
    textArea.style.overflow = 'hidden';
    textArea.style.background = 'transparent';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.resize = 'none';
    textArea.style.lineHeight = `${textNode.lineHeight()}`;
    textArea.style.fontFamily = textNode.fontFamily();
    textAreaContainer.style.transformOrigin = 'left top';
    textArea.style.textAlign = textNode.align();
    textArea.style.color = `${textNode.fill()}`;
    textArea.onfocus = () => {
      this.textAreaDomResize(textAreaContainer, textArea, textNode);
    };
    textArea.onkeydown = () => {
      this.textAreaDomResize(textAreaContainer, textArea, textNode);
    };
    textArea.onkeyup = () => {
      this.textAreaDomResize(textAreaContainer, textArea, textNode);
    };
    textArea.oninput = () => {
      this.textAreaDomResize(textAreaContainer, textArea, textNode);
    };
    const rotation = textNode.rotation();
    let transform = '';
    if (rotation) {
      transform += 'rotateZ(' + rotation + 'deg)';
    }

    const px = 0;
    const py = -3 * stage.scaleY();
    transform += 'translateX(' + px + 'px)';
    transform += 'translateY(' + py + 'px)';

    textArea.style.transform = transform;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyDown = (e: any) => {
      e.stopPropagation();
      if (textArea && textNode && e.key === 'Escape') {
        if (
          !textNode.getAttrs().layout ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL
        ) {
          const { width: textAreaWidth } = this.textRenderedSize(
            textArea.value,
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
            (textArea.scrollHeight + 1.6) * (1 / textNode.getAbsoluteScale().x)
          );
        }
        textNode.text(textArea.value);
        this.removeTextAreaDOM(textNode);
        this.instance.removeEventListener(
          'onZoomChange',
          this.onZoomChangeHandler(textNode).bind(this)
        );
        this.instance.removeEventListener(
          'onStageMove',
          this.onStageMoveHandler(textNode).bind(this)
        );
        window.removeEventListener('click', handleOutsideClick);
        return;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyUp = () => {
      textNode.text(textArea.value);
      if (textArea && textNode) {
        if (
          !textNode.getAttrs().layout ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_ALL ||
          textNode.getAttrs().layout === TEXT_LAYOUT.AUTO_HEIGHT
        ) {
          textAreaContainer.style.height = 'auto';
          textAreaContainer.style.height =
            textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
        }
        this.textAreaDomResize(textAreaContainer, textArea, textNode);
      }
    };

    textArea.addEventListener('keydown', handleKeyDown);
    textArea.addEventListener('keyup', handleKeyUp);

    textArea.tabIndex = 1;
    textArea.focus();

    const handleOutsideClick = (e: Event) => {
      let clickedOnCanvas = false;
      if ((e.target as Element)?.id === `${textNode.id()}_supercontainer`) {
        clickedOnCanvas = true;
      }

      if (clickedOnCanvas) {
        textNode.text(textArea.value);
        this.removeTextAreaDOM(textNode);

        textArea.removeEventListener('keydown', handleKeyDown);
        textArea.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('click', handleOutsideClick);
        window.removeEventListener('touchstart', handleOutsideClick);

        return;
      }
    };

    setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick);
    });
  }

  private updateTextAreaDOM(textNode: Konva.Text) {
    const textAreaContainer = document.getElementById(
      `${textNode.id()}_container`
    ) as HTMLDivElement | null;

    const textArea = document.getElementById(
      textNode.id()
    ) as HTMLTextAreaElement | null;

    if (!textAreaContainer || !textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const containerRect = stage.container().getBoundingClientRect();
    const textPosition = textNode.getClientRect();
    const position: Vector2d = {
      x: textPosition.x,
      y: textPosition.y,
    };

    textAreaContainer.style.top = -containerRect.y + position.y + 'px';
    textAreaContainer.style.left = -containerRect.x + position.x + 'px';
    if (textNode.getAttrs().verticalAlign === 'top') {
      textAreaContainer.style.alignItems = 'start';
    }
    if (textNode.getAttrs().verticalAlign === 'middle') {
      textAreaContainer.style.alignItems = 'center';
    }
    if (textNode.getAttrs().verticalAlign === 'bottom') {
      textAreaContainer.style.alignItems = 'end';
    }
    textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    textArea.rows = textNode.text().split('\n').length;
    textArea.style.lineHeight = `${textNode.lineHeight()}`;
    textArea.style.fontFamily = textNode.fontFamily();
    textArea.style.textAlign = textNode.align();
    textArea.style.color = `${textNode.fill()}`;

    this.textAreaDomResize(textAreaContainer, textArea, textNode);
    // call twice for side-effect
    this.textAreaDomResize(textAreaContainer, textArea, textNode);

    const rotation = textNode.rotation();
    let transform = '';
    if (rotation) {
      transform += 'rotateZ(' + rotation + 'deg)';
    }

    const px = 0;
    const py = -3 * stage.scaleY();
    transform += 'translateX(' + px + 'px)';
    transform += 'translateY(' + py + 'px)';

    textArea.style.transform = transform;

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
    const stage = this.instance.getStage();

    delete window.weaveTextEditing[textNode.id()];

    const textAreaSuperContainer = document.getElementById(
      `${textNode.id()}_supercontainer`
    ) as HTMLTextAreaElement | null;

    if (textAreaSuperContainer) {
      textAreaSuperContainer.remove();
    }

    const textAreaContainer = document.getElementById(
      `${textNode.id()}_container`
    ) as HTMLTextAreaElement | null;

    if (textAreaContainer) {
      textAreaContainer.remove();
    }

    const textArea = document.getElementById(
      textNode.id()
    ) as HTMLTextAreaElement | null;

    if (textArea) {
      textArea.remove();
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

    this.editing = false;
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
