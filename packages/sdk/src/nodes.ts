import { NodesStateChange, NodeSerializable, StateAction } from "@/types";
import { STATE_ACTIONS } from "./constants";
import { Weave } from "./weave";
import { WeaveNode } from "./nodes/node";

export class WeaveNodesManager {
  protected instance!: Weave;

  constructor(instance: Weave) {
    this.instance = instance;
  }

  private executeRuntimeAction(action: StateAction, node: WeaveNode, value: NodeSerializable) {
    switch (action) {
      case STATE_ACTIONS.CREATE: {
        node.addRuntime(value);
        break;
      }
      case STATE_ACTIONS.UPDATE: {
        node.updateRuntime(value);
        break;
      }
      case STATE_ACTIONS.DELETE: {
        node.removeRuntime(value.id, value);
        break;
      }
    }
  }

  addRuntime(node: NodeSerializable) {
    const registeredNodes = this.instance.getRegisteredNodes();

    if (registeredNodes[node.type]) {
      registeredNodes[node.type].addRuntime(node);
      return;
    }

    console.warn(`Node type ${node.type} has no runtime implementation`);
  }

  handleStateChange({ action, value }: NodesStateChange) {
    const registeredNodes = this.instance.getRegisteredNodes();

    if (registeredNodes[value.type]) {
      return this.executeRuntimeAction(action, registeredNodes[value.type], value);
    }

    console.warn(`Node type ${value.type} has no runtime implementation`);
  }

  add(node: NodeSerializable) {
    const configuration = this.instance.getConfiguration();
    const registeredNodes = this.instance.getRegisteredNodes();

    if (registeredNodes[node.type]) {
      registeredNodes[node.type].addState(node);
      configuration.callbacks?.onNodeAdded?.(node);
      this.instance.emit("onNodeAdded", node);
      return;
    }

    console.warn(`Node type ${node.type} has no runtime implementation`);
  }

  update(node: NodeSerializable) {
    const configuration = this.instance.getConfiguration();
    const registeredNodes = this.instance.getRegisteredNodes();

    if (registeredNodes[node.type]) {
      registeredNodes[node.type].updateState(node);
      configuration.callbacks?.onNodeUpdated?.(node);
      this.instance.emit("onNodeUpdated", node);
      return;
    }

    console.warn(`Node type ${node.type} has no runtime implementation`);
  }

  remove(node: Pick<NodeSerializable, "id" | "type">) {
    const configuration = this.instance.getConfiguration();
    const registeredNodes = this.instance.getRegisteredNodes();

    if (registeredNodes[node.type]) {
      registeredNodes[node.type].removeState(node.id);
      configuration.callbacks?.onNodeRemoved?.(node);
      this.instance.emit("onNodeRemoved", node);
      return;
    }

    console.warn(`Node type ${node.type} has no runtime implementation`);
  }
}
