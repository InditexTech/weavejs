// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import {
  type BoundingBox,
  type WeaveStateElement,
} from '@inditextech/weave-types';

export class WeaveStateManipulation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static mapPropsToYjs(props: Record<string, any>): Y.Map<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propsMap = new Y.Map<any>();

    for (const propKey of Object.keys(props)) {
      const propValue = props[propKey];
      if (Array.isArray(propValue)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childrenArray = new Y.Array<any>();
        propValue.forEach((child) => {
          const childMap = WeaveStateManipulation.mapPropsToYjs(child);
          childrenArray.push([childMap]);
        });
      } else if (
        typeof propValue === 'object' &&
        propValue !== null &&
        !Array.isArray(propValue)
      ) {
        propsMap.set(propKey, WeaveStateManipulation.mapPropsToYjs(propValue));
      } else {
        propsMap.set(propKey, propValue);
      }
    }

    return propsMap;
  }

  static mapNodeToYjs(node: WeaveStateElement): {
    nodeId: string;
    element: Y.Map<WeaveStateElement>;
  } {
    const nodeId = node.key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = new Y.Map<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementProps = new Y.Map<any>();

    element.set('key', nodeId);
    element.set('type', node.type);
    element.set('props', elementProps);

    for (const propKey of Object.keys(node.props)) {
      const propValue = node.props[propKey];
      if (Array.isArray(propValue) && propKey === 'children') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childrenArray = new Y.Array<any>();
        propValue.forEach((child) => {
          const childMap = WeaveStateManipulation.mapNodeToYjs(child);
          childrenArray.push([childMap.element]);
        });
        elementProps.set(propKey, childrenArray);
      } else if (Array.isArray(propValue) && propKey !== 'children') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childrenArray = new Y.Array<any>();
        propValue.forEach((child) => {
          const childMap = WeaveStateManipulation.mapPropsToYjs(child);
          childrenArray.push([childMap]);
        });
        elementProps.set(propKey, childrenArray);
      } else if (
        typeof propValue === 'object' &&
        propValue !== null &&
        !Array.isArray(propValue)
      ) {
        const childrenMap = WeaveStateManipulation.mapPropsToYjs(propValue);
        elementProps.set(propKey, childrenMap);
      } else {
        elementProps.set(propKey, propValue);
      }
    }

    return { nodeId: node.key, element };
  }

  static addElements(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerYjsElement: Y.Map<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElements: Y.Map<any>[]
  ): void {
    layerYjsElement.get('props').get('children').push(yjsElements);
  }

  static updateElements(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerYjsElement: Y.Map<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElements: Y.Map<any>[]
  ): void {
    for (const yjsElement of yjsElements) {
      const index = layerYjsElement
        .get('props')
        .get('children')
        .findIndex(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (child: Y.Map<any>) => child.get('key') === yjsElement.get('key')
        );

      if (index !== -1) {
        layerYjsElement.get('props').get('children').delete(index);
        layerYjsElement
          .get('props')
          .get('children')
          .insert(index, [yjsElement]);
      }
    }
  }

  static deleteElements(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerYjsElement: Y.Map<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsElements: Y.Map<any>[]
  ): void {
    for (const yjsElement of yjsElements) {
      const index = layerYjsElement
        .get('props')
        .get('children')
        .findIndex(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (child: Y.Map<any>) => child.get('key') === yjsElement.get('key')
        );

      if (index !== -1) {
        layerYjsElement.get('props').get('children').delete(index);
      }
    }
  }

  static getYjsElement(
    doc: Y.Doc,
    nodeId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Y.Map<any> | null {
    const stage = doc.getMap('weave');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageProps = stage.get('props') as Y.Map<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageChildren = stageProps.get('children') as Y.Array<any>;
    for (let i = 0; i < stageChildren.length; i++) {
      const child = stageChildren.get(i);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childProps = child.get('props') as Y.Map<any>;
      if (childProps.get('id') === nodeId) {
        return child;
      }

      if (childProps.get('children')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childChildren = childProps.get('children') as Y.Array<any>;
        for (let j = 0; j < childChildren.length; j++) {
          const grandChild = childChildren.get(j);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const grandChildProps = grandChild.get('props') as Y.Map<any>;
          if (grandChildProps.get('id') === nodeId) {
            return grandChild;
          }
        }
      }
    }
    return null;
  }

  static getNodesBoundingBox(nodes: WeaveStateElement[]): BoundingBox {
    const minX = Math.min(...nodes.map((n) => n.props.x));
    const minY = Math.min(...nodes.map((n) => n.props.y));
    const maxX = Math.max(...nodes.map((n) => n.props.x + n.props.width));
    const maxY = Math.max(...nodes.map((n) => n.props.y + n.props.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
