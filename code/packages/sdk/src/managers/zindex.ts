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

  sendToBack(instances: WeaveElementInstance | WeaveElementInstance[]): void {
    const nodes = Array.isArray(instances) ? instances : [instances];

    const nodesDescending = nodes.toSorted((a, b) => b.zIndex() - a.zIndex());

    for (const node of nodesDescending) {
      node.moveToBottom();

      const handler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );
      if (handler) {
        const nodeState = handler.serialize(node);
        this.instance.updateNode(nodeState);
        this.instance.moveNode(nodeState, WEAVE_NODE_POSITION.BACK);
      }
    }
  }

  bringToFront(instances: WeaveElementInstance | WeaveElementInstance[]): void {
    const nodes = Array.isArray(instances) ? instances : [instances];

    const nodesAscending = nodes.toSorted((a, b) => a.zIndex() - b.zIndex());

    for (const node of nodesAscending) {
      node.moveToTop();

      const handler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );
      if (handler) {
        const nodeState = handler.serialize(node);
        this.instance.updateNode(nodeState);
        this.instance.moveNode(nodeState, WEAVE_NODE_POSITION.FRONT);
      }
    }
  }
}
