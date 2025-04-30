// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
// import { Weave } from "./weave";
// import { Group } from "konva/lib/Group";
// import { WEAVE_NODE_LAYER_ID } from "./constants";
// import { NodeSerializable } from "./types";

export function resetScale(node: Konva.Node): void {
  node.width(
    Math.round(
      (Math.max(1, node.width() * node.scaleX()) + Number.EPSILON) * 100
    ) / 100
  );
  node.height(
    Math.round(
      (Math.max(1, node.height() * node.scaleY()) + Number.EPSILON) * 100
    ) / 100
  );
  node.scaleX(1);
  node.scaleY(1);
  node.x(Math.round((node.x() + Number.EPSILON) * 100) / 100);
  node.y(Math.round((node.y() + Number.EPSILON) * 100) / 100);
  node.rotation(Math.round((node.rotation() + Number.EPSILON) * 100) / 100);
}

// export function updateLayerNodesZIndex(instance: Weave) {
//   const stage = instance.getStage();

//   const nodesLayer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer | undefined;
//   if (nodesLayer) {
//     updateNodesZIndex(instance, nodesLayer.getChildren());
//   }
// }

// export function updateNodesZIndex(instance: Weave, nodes: (Konva.Node | Group)[]) {
// const state = instance.getStore().getState();
// for (const node of nodes) {
//   const attrs = node.getAttrs() as NodeSerializable;
//   if (state.weave.nodes?.[attrs.id]) {
//     state.weave.nodes[attrs.id].zIndex = node.getZIndex();
//   }
//   if (attrs.type === "group") {
//     const groupNode = node as Group;
//     updateNodesZIndex(instance, groupNode.getChildren());
//   }
// }
// }
