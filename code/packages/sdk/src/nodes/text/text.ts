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

    text.on('dblclick dbltap', (evt) => {
      evt.cancelBubble = true;

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

  private createTextAreaDOM(textNode: Konva.Text, position: Vector2d) {
    const stage = this.instance.getStage();

    // create textarea and style it
    const textArea = document.createElement('textarea');
    stage.container().appendChild(textArea);

    window.weaveTextEditing = true;

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
      'px';
    textArea.style.fontSize =
      textNode.fontSize() * textNode.getAbsoluteScale().x + 'px';
    textArea.style.border = 'solid 1px rgba(0,0,255,0.5)';
    textArea.style.padding = '0px';
    textArea.style.margin = '0px';
    textArea.style.overflow = 'hidden';
    textArea.style.background = 'rgba(255,255,255,0.5)';
    textArea.style.outline = 'none';
    textArea.style.resize = 'none';
    textArea.style.lineHeight = `${textNode.lineHeight()}`;
    textArea.style.fontFamily = textNode.fontFamily();
    textArea.style.transformOrigin = 'left top';
    textArea.style.textAlign = textNode.align();
    textArea.style.color = `${textNode.fill()}`;
    const rotation = textNode.rotation();
    let transform = '';
    if (rotation) {
      transform += 'rotateZ(' + rotation + 'deg)';
    }

    const px = 1;
    const py = 2;
    transform += 'translateX(-' + px + 'px)';
    transform += 'translateY(-' + py + 'px)';

    textArea.style.transform = transform;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyDown = (e: any) => {
      if (textArea && textNode) {
        // hide on enter
        // but don't hide on shift + enter
        if (e.key === 'Enter' && !e.shiftKey) {
          textNode.text(textArea.value);
          this.updateNode(textNode);
          this.removeTextAreaDOM(textNode);
          window.removeEventListener('click', handleOutsideClick);
          return;
        }
        if (e.key === 'Enter' && e.shiftKey) {
          if (textArea && textNode) {
            try {
              textNode.text(textArea.value);
              textArea.style.width =
                textNode.width() * textNode.getAbsoluteScale().x + 'px';
              textArea.style.height = 'auto';
              textArea.style.height =
                textArea.scrollHeight +
                textNode.fontSize() * textNode.getAbsoluteScale().x +
                'px';
              textArea.tabIndex = 1;
              textArea.focus();
            } catch (ex) {
              console.error(ex);
            }
          }
          return;
        }
        // on esc do not set value back to node
        if (e.key === 'Escape') {
          this.removeTextAreaDOM(textNode);
          window.removeEventListener('click', handleOutsideClick);
          return;
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyUp = (e: any) => {
      textNode.text(textArea.value);
      if (textArea && textNode) {
        // textNode.text(textArea.value);
        textArea.style.width =
          textNode.width() * textNode.getAbsoluteScale().x + 'px';
        if (!(e.key === 'Enter' && e.shiftKey)) {
          textArea.style.height = 'auto';
          textArea.style.height = textArea.scrollHeight + 'px';
        }
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

    window.weaveTextEditing = false;

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
