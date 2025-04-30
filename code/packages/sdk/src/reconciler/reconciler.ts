// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEqual } from 'lodash';
import Konva from 'konva';
import { DefaultEventPriority } from './constants';
import {
  type WeaveElementInstance,
  type WeaveElementAttributes,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';

export class WeaveReconciler {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('reconciler');
  }

  addNode(
    parentInstance: WeaveElementInstance,
    child: WeaveElementInstance
  ): void {
    const parentAttrs = parentInstance.getAttrs();

    const childInitialZIndex = child.getAttrs().initialZIndex;

    if (parentInstance instanceof Konva.Stage && child instanceof Konva.Layer) {
      parentInstance.add(child);
    }
    if (parentInstance instanceof Konva.Layer) {
      parentInstance.add(child);
    }
    if (
      parentInstance instanceof Konva.Group &&
      typeof parentAttrs.containerId !== 'undefined'
    ) {
      const realParent = parentInstance.findOne(
        `#${parentAttrs.containerId}`
      ) as Konva.Group | undefined;
      realParent?.add(child);
    }
    if (
      parentInstance instanceof Konva.Group &&
      typeof parentAttrs.containerId === 'undefined'
    ) {
      parentInstance.add(child);
    }

    if (childInitialZIndex) {
      child.zIndex(childInitialZIndex);
    }
  }

  getConfig() {
    const weaveInstance = this.instance;
    const logger = this.logger;
    const addNode = this.addNode;

    return {
      noTimeout: -1,
      isPrimaryRenderer: true,
      supportsPersistence: false,
      supportsHydration: false,
      supportsMutation: true,
      supportsMicrotasks: false,
      getCurrentEventPriority(): number {
        return DefaultEventPriority;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getInstanceFromNode(node: any) {
        logger.debug({ node }, 'getInstanceFromNode');
        return null;
      },
      beforeActiveInstanceBlur(): void {
        logger.debug('beforeActiveInstanceBlur');
      },
      afterActiveInstanceBlur(): void {
        logger.debug('afterActiveInstanceBlur');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prepareScopeUpdate(scopeInstance: any, instance: any): void {
        logger.debug({ scopeInstance, instance }, 'prepareScopeUpdate');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getInstanceFromScope(scopeInstance: any) {
        logger.debug({ scopeInstance }, 'getInstanceFromScope');
        return null;
      },
      getRootHostContext(rootContainer: Weave): Weave {
        logger.debug({ rootContainer }, 'getRootHostContext');
        return rootContainer;
      },
      prepareForCommit(containerInfo: Weave) {
        logger.debug({ containerInfo }, 'prepareForCommit');
        return null;
      },
      scheduleTimeout(
        fn: (...args: unknown[]) => unknown,
        delay?: number
      ): NodeJS.Timeout {
        logger.debug({ fn, delay }, 'scheduleTimeout');
        return setTimeout(fn, delay);
      },
      cancelTimeout(id: NodeJS.Timeout | undefined): void {
        logger.debug({ id }, 'cancelTimeout');
        if (id) {
          clearTimeout(id);
        }
      },
      preparePortalMount(containerInfo: Weave): void {
        logger.debug({ containerInfo }, 'preparePortalMount');
      },
      resetAfterCommit(containerInfo: Weave): void {
        logger.debug({ containerInfo }, 'resetAfterCommit');
      },
      createTextInstance(
        text: string,
        rootContainer: Weave,
        hostContext: Weave
      ) {
        logger.debug(
          { text, rootContainer, hostContext },
          'createTextInstance'
        );
        return null;
      },
      getChildHostContext(
        parentHostContext: Weave,
        type: string,
        rootContainer: Weave
      ): Weave {
        logger.debug(
          { parentHostContext, type, rootContainer },
          'getChildHostContext'
        );
        return parentHostContext;
      },
      shouldSetTextContent(type: string, props: WeaveElementAttributes) {
        logger.debug({ type, props }, 'shouldSetTextContext');
        return false;
      },
      createInstance(
        type: string,
        props: WeaveElementAttributes,
        rootContainer: Weave,
        hostContext: Weave
      ): WeaveElementInstance | undefined {
        logger.debug(
          { type, props, rootContainer, hostContext },
          'createInstance'
        );
        const handler = rootContainer.getNodeHandler(type);

        if (!handler) {
          return undefined;
        }

        const newProps = { ...props };
        delete newProps.zIndex;
        newProps.initialZIndex = props.zIndex;

        if (type === 'stage') {
          newProps.container = rootContainer.getStageConfiguration().container;
          newProps.width = rootContainer.getStageConfiguration().width;
          newProps.height = rootContainer.getStageConfiguration().height;
        }

        return handler.onRender(newProps);
      },
      detachDeletedInstance(node: WeaveElementInstance): void {
        logger.debug({ node }, 'detachDeletedInstance');
      },
      getPublicInstance(instance: WeaveElementInstance): WeaveElementInstance {
        logger.debug({ instance }, 'getPublicInstance');
        return instance;
      },
      appendInitialChild(
        parentInstance: WeaveElementInstance,
        child: WeaveElementInstance
      ): void {
        logger.debug({ parentInstance, child }, 'appendInitialChild');
        addNode(parentInstance, child);
      },
      appendChildToContainer(
        container: Weave,
        child: WeaveElementInstance
      ): void {
        logger.debug({ container, child }, 'appendChildToContainer');
        if (child instanceof Konva.Stage) {
          container.getStageManager().setStage(child);
        }
      },
      insertInContainerBefore(
        container: Weave,
        child: WeaveElementInstance
      ): void {
        logger.debug({ container, child }, 'insertInContainerBefore');
      },
      insertBefore(
        parentInstance: WeaveElementInstance,
        child: WeaveElementInstance,
        beforeChild: WeaveElementInstance
      ): void {
        logger.debug({ parentInstance, child, beforeChild }, 'insertBefore ');
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
      appendChild(
        parentInstance: WeaveElementInstance,
        child: WeaveElementInstance
      ): void {
        logger.debug({ parentInstance, child }, 'appendChild');
        addNode(parentInstance, child);
      },
      finalizeInitialChildren() {
        logger.debug('finalizeInitialChildren');
        return false;
      },
      prepareUpdate(
        instance: WeaveElementInstance,
        type: string,
        oldProps: WeaveElementAttributes,
        newProps: WeaveElementAttributes,
        rootContainer: Weave,
        hostContext: Weave
      ) {
        logger.debug(
          { instance, type, oldProps, newProps, rootContainer, hostContext },
          'clearContainer'
        );
        return {};
      },
      clearContainer(container: Weave): void {
        logger.debug({ container }, 'clearContainer');
      },
      setCurrentUpdatePriority(): void {
        logger.debug('setCurrentUpdatePriority');
      },
      getCurrentUpdatePriority(): number {
        logger.debug('getCurrentUpdatePriority');
        return 1;
      },
      resolveUpdatePriority(): number {
        logger.debug('resolveUpdatePriority');
        return 1;
      },
      maySuspendCommit(): void {
        logger.debug('maySuspendCommit');
      },
      commitUpdate(
        instance: WeaveElementInstance,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
        _: any,
        type: string,
        prevProps: WeaveElementAttributes,
        nextProps: WeaveElementAttributes
      ): void {
        logger.debug({ instance, type, prevProps, nextProps }, 'commitUpdate');

        if (instance instanceof Weave) {
          return;
        }

        if (!isEqual(prevProps, nextProps)) {
          const handler = weaveInstance.getNodeHandler(type);

          if (!handler) {
            return;
          }

          handler.onUpdate(instance, nextProps);

          const childZIndex = nextProps.zIndex;
          if (childZIndex) {
            instance.zIndex(childZIndex as number);
          }
        }
      },
      removeChildFromContainer(): void {
        logger.debug('removeChildFromContainer');
      },
      removeChild(_: WeaveElementInstance, child: WeaveElementInstance): void {
        logger.debug({ child }, 'removeChild');

        const type = child.getAttrs().nodeType;

        const handler = weaveInstance.getNodeHandler(type);

        if (!handler) {
          return;
        }

        handler.onDestroy(child);
      },
    };
  }
}
