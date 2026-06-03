// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import {
  type BoundingBox,
  type WeaveStateElement,
} from '@inditextech/weave-types';

export class WeaveStateManipulation {
  /**
   * Converts any JS value to the appropriate Yjs type:
   * - null / undefined / primitive → returned as-is
   * - Array → Y.Array (elements mapped recursively)
   * - plain object → Y.Map (values mapped recursively)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static mapValueToYjs(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr = new Y.Array<any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arr.push(value.map((item: any) => WeaveStateManipulation.mapValueToYjs(item)));
      return arr;
    }

    if (typeof value === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Y.Map<any>();
      for (const [k, v] of Object.entries(value)) {
        map.set(k, WeaveStateManipulation.mapValueToYjs(v));
      }
      return map;
    }

    // primitive (string, number, boolean)
    return value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static mapPropsToYjs(props: Record<string, any>): Y.Map<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propsMap = new Y.Map<any>();

    for (const [propKey, propValue] of Object.entries(props)) {
      propsMap.set(propKey, WeaveStateManipulation.mapValueToYjs(propValue));
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

    for (const [propKey, propValue] of Object.entries(node.props)) {
      if (propKey === 'children' && Array.isArray(propValue)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childrenArray = new Y.Array<any>();
        propValue.forEach((child: WeaveStateElement) => {
          const { element: childElement } = WeaveStateManipulation.mapNodeToYjs(child);
          childrenArray.push([childElement]);
        });
        elementProps.set(propKey, childrenArray);
      } else {
        elementProps.set(propKey, WeaveStateManipulation.mapValueToYjs(propValue));
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
    yjsElements: { nodeId: string; element: Y.Map<any> }[]
  ): void {
    for (let i = 0; i < yjsElements.length; i++) {
      const yjsElement = yjsElements[i];
      const nodeId = yjsElement.nodeId;
      const element = yjsElement.element;

      const childrenArr = JSON.parse(
        JSON.stringify(layerYjsElement.get('props').get('children'))
      );

      const index = childrenArr.findIndex(
        (child: WeaveStateElement) => child['key'] === nodeId
      );

      if (index !== -1) {
        layerYjsElement.get('props').get('children').delete(index);
        layerYjsElement.get('props').get('children').insert(index, [element]);
      }
    }
  }

  static deleteElements(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerYjsElement: Y.Map<any>,
    yjsElementsIds: string[]
  ): void {
    for (let i = 0; i < yjsElementsIds.length; i++) {
      const yjsElementId = yjsElementsIds[i];

      const childrenArr = JSON.parse(
        JSON.stringify(layerYjsElement.get('props').get('children'))
      );

      const index = childrenArr.findIndex(
        (child: WeaveStateElement) => child['key'] === yjsElementId
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
