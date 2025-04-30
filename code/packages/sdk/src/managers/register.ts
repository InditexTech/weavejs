// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { WeavePlugin } from '@/plugins/plugin';
import { WeaveNode } from '@/nodes/node';
import { WeaveAction } from '@/actions/action';

export class WeaveRegisterManager {
  private instance: Weave;
  private nodesHandlers: Record<string, WeaveNode> = {};
  private actionsHandlers: Record<string, WeaveAction> = {};
  private plugins: Record<string, WeavePlugin> = {};
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('register-manager');
    this.logger.debug('Register manager created');
  }

  getPlugins(): Record<string, WeavePlugin> {
    return this.plugins;
  }

  getNodesHandlers(): Record<string, WeaveNode> {
    return this.nodesHandlers;
  }

  getActionsHandlers(): Record<string, WeaveAction> {
    return this.actionsHandlers;
  }

  getPlugin<T>(pluginName: string) {
    if (!this.plugins[pluginName]) {
      const msg = `Plugin with name [${pluginName}] is not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }
    return this.plugins[pluginName] as T;
  }

  getActionHandler<T>(actionName: string) {
    if (!this.actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] is not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }
    return this.actionsHandlers[actionName] as T;
  }

  getNodeHandler(nodeType: string): WeaveNode {
    if (!this.nodesHandlers[nodeType]) {
      const msg = `Node handler with type [${nodeType}] is not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return this.nodesHandlers[nodeType];
  }

  registerPlugins(): void {
    const config = this.instance.getConfiguration();
    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.registerPlugin(plugin as WeavePlugin);
      }
    }

    this.logger.info(`Plugins registered`);
  }

  registerPlugin(plugin: WeavePlugin): void {
    const pluginName = plugin.getName();
    plugin.register(this.instance);
    this.plugins[pluginName] = plugin;
  }

  registerNodesHandlers(): void {
    const config = this.instance.getConfiguration();
    if (config.nodes) {
      for (const node of config.nodes) {
        this.registerNodeHandler(node as WeaveNode);
      }
    }

    this.logger.info(`Nodes handlers registered`);
  }

  registerNodeHandler(node: WeaveNode): void {
    const nodeType = node.getNodeType();
    if (this.nodesHandlers[nodeType]) {
      const msg = `Node handler with type [${nodeType}] already exists`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    node.register(this.instance);
    this.nodesHandlers[nodeType] = node;
  }

  registerActionsHandlers(): void {
    const config = this.instance.getConfiguration();
    if (config.actions) {
      for (const action of config.actions) {
        this.registerActionHandler(action as WeaveAction);
      }
    }

    this.logger.info(`Actions handlers registered`);
  }

  registerActionHandler(action: WeaveAction): void {
    const actionName = action.getName();
    if (this.actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] already exists`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    action.register(this.instance);
    this.actionsHandlers[actionName] = action;
  }
}
