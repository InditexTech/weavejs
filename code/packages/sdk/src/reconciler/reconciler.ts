import { isEqual } from "lodash";
import Konva from "konva";
import { DefaultEventPriority } from "./constants";
import { WeaveElementInstance, WeaveElementAttributes, WeaveReconcilerConfig } from "@/types";
import { Weave } from "@/weave";

export class WeaveReconciler {
  private instance: Weave;
  private config!: WeaveReconcilerConfig;

  constructor(instance: Weave, config: WeaveReconcilerConfig) {
    this.instance = instance;
    this.config = config;
  }

  getConfig() {
    const debug = this.config.debug ?? false;
    const weaveInstance = this.instance;

    return {
      noTimeout: -1,
      isPrimaryRenderer: true,
      supportsPersistence: false,
      supportsHydration: false,
      supportsMutation: true,
      supportsMicrotasks: false,
      getCurrentEventPriority() {
        return DefaultEventPriority;
      },
      getInstanceFromNode(node: any) {
        debug && console.log("getInstanceFromNode", node);
        return null;
      },
      beforeActiveInstanceBlur() {
        debug && console.log("beforeActiveInstanceBlur");
      },
      afterActiveInstanceBlur() {
        debug && console.log("afterActiveInstanceBlur");
      },
      prepareScopeUpdate(scopeInstance: any, instance: any) {
        debug && console.log("prepareScopeUpdate", scopeInstance, instance);
      },
      getInstanceFromScope(scopeInstance: any) {
        debug && console.log("getInstanceFromScope", scopeInstance);
        return null;
      },
      getRootHostContext(rootContainer: Weave) {
        debug && console.log("getRootHostContext", rootContainer);
        return rootContainer;
      },
      prepareForCommit(containerInfo: Weave) {
        debug && console.log("prepareForCommit", containerInfo);
        return null;
      },
      scheduleTimeout(fn: (...args: unknown[]) => unknown, delay?: number) {
        debug && console.log("preparescheduleTimeoutPortalMount", fn, delay);
        return setTimeout(fn, delay);
      },
      cancelTimeout(id: NodeJS.Timeout | undefined) {
        debug && console.log("cancelTimeout", id);
        if (id) {
          clearTimeout(id);
        }
      },
      preparePortalMount(containerInfo: Weave) {
        debug && console.log("preparePortalMount", containerInfo);
      },
      resetAfterCommit(containerInfo: Weave) {
        debug && console.log("resetAfterCommit", containerInfo);
      },
      createTextInstance(text: string, rootContainer: Weave, hostContext: Weave) {
        debug && console.log("createTextInstance", text, rootContainer, hostContext);
        return null;
      },
      getChildHostContext(parentHostContext: Weave, type: string, rootContainer: Weave) {
        debug && console.log("getChildHostContext", parentHostContext, type, rootContainer);
        return parentHostContext;
      },
      shouldSetTextContent(type: string, props: WeaveElementAttributes) {
        debug && console.log("shouldSetTextContext", type, props);
        return false;
      },
      createInstance(type: string, props: WeaveElementAttributes, rootContainer: Weave, hostContext: Weave) {
        debug && console.log("createInstance", type, props, rootContainer, hostContext);
        const handler = rootContainer.getNodeHandler(type);

        if (!handler) {
          return undefined;
        }

        return handler.createInstance(props);
      },
      detachDeletedInstance(node: WeaveElementInstance) {
        debug && console.log("detachDeletedInstance", node);
      },
      getPublicInstance(instance: WeaveElementInstance) {
        debug && console.log("getPublicInstance", instance);
        return instance;
      },
      appendInitialChild(parentInstance: WeaveElementInstance, child: WeaveElementInstance) {
        debug && console.log("appendInitialChild", parentInstance, child);
        if (parentInstance instanceof Konva.Stage && child instanceof Konva.Layer) {
          parentInstance.add(child);
        }
        if (parentInstance instanceof Konva.Layer && child instanceof Konva.Shape) {
          parentInstance.add(child);
        }
        if (parentInstance instanceof Konva.Group && child instanceof Konva.Shape) {
          parentInstance.add(child);
        }
      },
      appendChildToContainer(container: Weave, child: WeaveElementInstance) {
        debug && console.log("appendChildToContainer", container, child);
        if (child instanceof Konva.Stage) {
          container.setStage(child);
        }
      },
      insertInContainerBefore(container: Weave, child: WeaveElementInstance) {
        debug && console.log("insertInContainerBefore", container, child);
      },
      insertBefore(
        parentInstance: WeaveElementInstance,
        child: WeaveElementInstance,
        beforeChild: WeaveElementInstance,
      ) {
        debug && console.log("insertBefore ", parentInstance, child, beforeChild);
        if (parentInstance instanceof Konva.Layer) {
          parentInstance.add(child);
          const beforeChildZIndex = beforeChild.zIndex();
          child.zIndex(beforeChildZIndex - 1);
        }
        if (parentInstance instanceof Konva.Group) {
          parentInstance.add(child);
          const beforeChildZIndex = beforeChild.zIndex();
          child.zIndex(beforeChildZIndex - 1);
        }
      },
      appendChild(parentInstance: WeaveElementInstance, child: WeaveElementInstance) {
        debug && console.log("appendChild", parentInstance, child);
        if (parentInstance instanceof Konva.Layer) {
          parentInstance.add(child);
        }
        if (parentInstance instanceof Konva.Group) {
          parentInstance.add(child);
        }
      },
      finalizeInitialChildren() {
        debug && console.log("finalizeInitialChildren");
        return false;
      },
      prepareUpdate(
        instance: WeaveElementInstance,
        type: string,
        oldProps: WeaveElementAttributes,
        newProps: WeaveElementAttributes,
        rootContainer: Weave,
        hostContext: Weave,
      ) {
        debug && console.log("clearContainer", instance, type, oldProps, newProps, rootContainer, hostContext);
        return null;
      },
      clearContainer(container: Weave) {
        debug && console.log("clearContainer", container);
      },
      setCurrentUpdatePriority() {
        debug && console.log("setCurrentUpdatePriority");
      },
      getCurrentUpdatePriority() {
        debug && console.log("getCurrentUpdatePriority");
        return 1;
      },
      resolveUpdatePriority() {
        debug && console.log("resolveUpdatePriority");
        return 1;
      },
      maySuspendCommit() {
        debug && console.log("maySuspendCommit");
      },
      commitUpdate(
        instance: WeaveElementInstance,
        type: string,
        prevProps: WeaveElementAttributes,
        nextProps: WeaveElementAttributes,
      ) {
        debug && console.log("commitUpdate", instance, type, prevProps, nextProps);
        if (instance instanceof Weave) {
          return;
        }

        if (!isEqual(prevProps, nextProps)) {
          const handler = weaveInstance.getNodeHandler(type);

          if (!handler) {
            return;
          }

          handler.updateInstance(instance, nextProps);
        }
      },
      removeChildFromContainer() {
        debug && console.log("removeChildFromContainer");
      },
      removeChild(_: WeaveElementInstance, child: WeaveElementInstance) {
        debug && console.log("removeChild", child);
        child.destroy();
      },
    };
  }
}
