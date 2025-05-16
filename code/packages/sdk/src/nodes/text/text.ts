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

    this.setupDefaultNodeEvents(text);

    window.addEventListener('keypress', (e) => {
      if (this.editing) {
        return;
      }

      if (e.key !== 'Enter' && !e.shiftKey) {
        return;
      }

      if (this.isSelecting() && this.isNodeSelected(text)) {
        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
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
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.triggerEditMode;

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

  private resizeTextAreaDOM(textNode: Konva.Text) {
    const textArea = document.getElementById(
      textNode.id()
    ) as HTMLTextAreaElement | null;

    if (!textArea) {
      return;
    }

    const stage = this.instance.getStage();
    const textPosition = textNode.absolutePosition();
    const position: Vector2d = {
      x: stage.container().offsetLeft + textPosition.x,
      y: stage.container().offsetTop + textPosition.y,
    };

    textArea.style.top = position.y + 'px';
    textArea.style.left = position.x + 'px';
    textArea.style.width =
      textNode.getWidth() * textNode.getAbsoluteScale().x + 'px';
    textArea.style.height =
      textNode.getHeight() * textNode.getAbsoluteScale().x + 'px';
    textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
  }

  private onZoomChangeHandler = (textNode: Konva.Text) => () => {
    if (!this.editing) {
      return;
    }

    this.resizeTextAreaDOM(textNode);
  };

  private onStageMoveHandler = (textNode: Konva.Text) => () => {
    if (!this.editing) {
      return;
    }

    this.resizeTextAreaDOM(textNode);
  };

  private createTextAreaDOM(textNode: Konva.Text, position: Vector2d) {
    const stage = this.instance.getStage();

    // create textarea and style it
    const textArea = document.createElement('textarea');
    textArea.id = textNode.id();
    stage.container().appendChild(textArea);

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
    textArea.style.position = 'fixed';
    textArea.style.top = position.y + 'px';
    textArea.style.left = position.x + 'px';
    textArea.style.width =
      (textNode.width() - textNode.padding() * 2) *
        textNode.getAbsoluteScale().x +
      'px';
    textArea.style.height =
      (textNode.height() - textNode.padding() * 2) *
        textNode.getAbsoluteScale().x +
      2 +
      'px';
    textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    textArea.style.border = 'solid 1px #1e40af';
    // textArea.style.padding = '0px';
    // textArea.style.paddingTop = '0.1em';
    textArea.style.minHeight = 'auto';
    textArea.style.margin = '0px';
    textArea.style.overflow = 'hidden';
    textArea.style.background = 'transparent';
    textArea.style.outline = 'none';
    textArea.style.resize = 'none';
    textArea.style.lineHeight = `${textNode.lineHeight()}`;
    textArea.style.fontFamily = textNode.fontFamily();
    textArea.style.transformOrigin = 'left top';
    textArea.style.textAlign = textNode.align();
    textArea.style.color = `${textNode.fill()}`;
    textArea.onfocus = () => {
      textArea.style.height = 'auto';
      textArea.style.height =
        textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    };
    textArea.onkeydown = () => {
      textArea.style.height = 'auto';
      textArea.style.height =
        textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
    };
    textArea.onkeyup = () => {
      textArea.style.height = 'auto';
      textArea.style.height =
        textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
    };
    textArea.onwheel = (e) => {
      e.preventDefault();
    };
    textArea.oninput = () => {
      textArea.style.height = 'auto';
      textArea.style.height =
        textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
    };
    const rotation = textNode.rotation();
    let transform = '';
    if (rotation) {
      transform += 'rotateZ(' + rotation + 'deg)';
    }

    const px = 0;
    const py = -3 * textNode.getAbsoluteScale().x;
    transform += 'translateX(' + px + 'px)';
    transform += 'translateY(' + py + 'px)';

    textArea.style.transform = transform;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyDown = (e: any) => {
      if (textArea && textNode) {
        if (e.key === 'Enter') {
          if (textArea && textNode) {
            try {
              textNode.text(textArea.value);
              textArea.style.width =
                textNode.width() * textNode.getAbsoluteScale().x + 'px';
              textArea.style.height = 'auto';
              textArea.style.height =
                textArea.scrollHeight +
                1.6 * textNode.getAbsoluteScale().x +
                'px';
              textArea.tabIndex = 1;
              textArea.focus();
            } catch (ex) {
              console.error(ex);
            }
          }
          return;
        }
        // save changes
        if (e.key === 'Escape') {
          textNode.width(
            parseFloat(textArea.style.width) *
              (1 / textNode.getAbsoluteScale().x)
          );
          textNode.height(
            (textArea.scrollHeight + 1.6) * (1 / textNode.getAbsoluteScale().x)
          );
          textNode.text(textArea.value);
          this.updateNode(textNode);
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
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyUp = () => {
      textNode.text(textArea.value);
      if (textArea && textNode) {
        // textNode.text(textArea.value);
        textArea.style.width =
          textNode.width() * textNode.getAbsoluteScale().x + 'px';
        textArea.style.height = 'auto';
        textArea.style.height =
          textArea.scrollHeight + 1.6 * textNode.getAbsoluteScale().x + 'px';
      }
    };

    textArea.addEventListener('keydown', handleKeyDown);
    textArea.addEventListener('keyup', handleKeyUp);

    textArea.tabIndex = 1;
    textArea.focus();

    const handleOutsideClick = (e: Event | null) => {
      if (!e && textArea.value === '') {
        this.updateNode(textNode);
        this.removeTextAreaDOM(textNode);

        textArea.removeEventListener('keydown', handleKeyDown);
        textArea.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('click', handleOutsideClick);
        window.removeEventListener('touchstart', handleOutsideClick);
      }
      if (e && e.target !== textArea && textArea.value !== '') {
        textNode.text(textArea.value);
        this.updateNode(textNode);
        this.removeTextAreaDOM(textNode);

        textArea.removeEventListener('keydown', handleKeyDown);
        textArea.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('click', handleOutsideClick);
        window.removeEventListener('touchstart', handleOutsideClick);
      }
    };

    setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick);
    });
  }

  private removeTextAreaDOM(textNode: Konva.Text) {
    const stage = this.instance.getStage();

    delete window.weaveTextEditing[textNode.id()];

    const textArea = document.getElementById(
      textNode.id()
    ) as HTMLTextAreaElement | null;

    if (textArea) {
      textArea.remove();
    }

    textNode.visible(true);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.enablePlugin('nodesSelection');
      const tr = selectionPlugin.getTransformer();
      if (tr) {
        tr.nodes([textNode]);
        tr.show();
        tr.forceUpdate();
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

    const areaPosition: Vector2d = {
      x: stage.container().offsetLeft + textPosition.x,
      y: stage.container().offsetTop + textPosition.y,
    };

    this.createTextAreaDOM(textNode, areaPosition);
  }
}
