// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';
import {
  type WeaveElementInstance,
  WEAVE_NODE_POSITION,
} from '@inditextech/weave-types';
import type { WeaveNode } from '@/nodes/node';

export class WeaveZIndexManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('zindex-manager');
    this.logger.debug('zIndex manager created');
  }

  moveUp(instance: WeaveElementInstance): void {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], up one step of z-index`
    );

    instance.moveUp();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.UP);
    }
  }

  moveDown(instance: WeaveElementInstance): void {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], down one step of z-index`
    );

    instance.moveDown();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.DOWN);
    }
  }

  sendToBack(instance: WeaveElementInstance): void {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], to bottom of z-index`
    );

    instance.moveToBottom();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.BACK);
    }
  }

  bringToFront(instance: WeaveElementInstance): void {
    this.logger.debug(
      `Moving instance with id [${instance.getAttrs().id}], to top of z-index`
    );

    instance.moveToTop();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.updateNode(node);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.FRONT);
    }
  }

  sendToBackNodes(nodes: WeaveElementInstance[]): void {
    this.logger.debug(
      `Moving instance with id [${
        instance.getAttrs().id
      }], to bottom of z-index`
    );

    instance.moveToBottom();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.BACK);
    }
  }

  bringToFrontNodes(nodes: WeaveElementInstance[]): void {
    this.logger.debug(
      `Moving instance with id [${instance.getAttrs().id}], to top of z-index`
    );

    instance.moveToTop();

    const handler = this.instance.getNodeHandler<WeaveNode>(
      instance.getAttrs().nodeType
    );
    if (handler) {
      const node = handler.serialize(instance);
      this.instance.updateNode(node);
      this.instance.moveNode(node, WEAVE_NODE_POSITION.FRONT);
    }
  }
}
