// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { orderBy } from "lodash";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { Weave } from "@/weave";
import { Vector2d } from "konva/lib/types";
import { Logger } from "pino";

export class WeaveCloningManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger("cloning-manager");
    this.logger.debug("Cloning manager created");
  }

  private allInstancesInSameParent(nodes: Konva.Node[]) {
    if (nodes.length === 0) {
      return { allInSame: false, nodeId: undefined, parentId: undefined };
    }

    let allInSame = true;
    const parentId = nodes[0]?.getParent()?.getAttrs().id;
    const nodeId = nodes[0]?.getParent()?.getAttrs().nodeId;
    for (const node of nodes) {
      const nodeParentId = node?.getParent()?.getAttrs().id;
      if (nodeParentId !== parentId) {
        allInSame = false;
        break;
      }
    }

    return { allInSame, nodeId, parentId };
  }

  cloneNodes(
    instancesToClone: Konva.Node[],
    targetContainer: Konva.Group | Konva.Layer | undefined,
    onPoint: Vector2d,
  ) {
    if (instancesToClone.length === 0) {
      return;
    }

    if (!targetContainer) {
      return;
    }

    const { allInSame } = this.allInstancesInSameParent(instancesToClone);

    if (!allInSame) {
      return;
    }

    const groupId = uuidv4();
    const newGroup = new Konva.Group({
      id: groupId,
    });

    targetContainer.add(newGroup);

    const nodesWithZIndex = instancesToClone
      .map((node) => ({ node, zIndex: node.zIndex() }))
      .filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(nodesWithZIndex, ["zIndex"], ["asc"]).map((node) => node.node);

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      const nodeAttrs = node.getAttrs();

      if (nodeAttrs.type === "group") {
        const clonedNode: Konva.Group = node.clone({
          id: uuidv4(),
          type: "group",
        });

        const nodePos = clonedNode.getAbsolutePosition();
        const nodeRotation = clonedNode.getAbsoluteRotation();

        clonedNode.moveTo(newGroup);
        clonedNode.zIndex(index);
        clonedNode.setAbsolutePosition(nodePos);
        clonedNode.rotation(nodeRotation);

        continue;
      }

      const clonedNode = node.clone({
        id: uuidv4(),
      });

      const nodePos = clonedNode.getAbsolutePosition();
      const nodeRotation = clonedNode.getAbsoluteRotation();

      clonedNode.moveTo(newGroup);
      clonedNode.zIndex(index);
      clonedNode.setAbsolutePosition(nodePos);
      clonedNode.rotation(nodeRotation);
    }

    const actualPos = newGroup.getClientRect({ relativeTo: targetContainer });

    newGroup.x(onPoint.x - actualPos.x);
    newGroup.y(onPoint.y - actualPos.y);

    const groupChildren = [...newGroup.getChildren()];
    for (const [index, node] of groupChildren.entries()) {
      const nodePos = node.getAbsolutePosition();
      const nodeRotation = node.getAbsoluteRotation();

      node.moveTo(targetContainer);
      node.zIndex(index);
      node.setAbsolutePosition(nodePos);
      node.rotation(nodeRotation);

      const handler = this.instance.getNodeHandler(node.getAttrs().nodeType);
      const stateNode = handler.toNode(node);

      this.instance.addNode(stateNode, targetContainer.getAttrs().id);
      node.destroy();
    }

    newGroup.destroy();
  }
}
