import { orderBy } from "lodash";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { GroupsStateChange, NodeSerializable } from "@/types";
import { STATE_ACTIONS } from "./constants";
import { WEAVE_NODE_LAYER_ID } from "./plugins/nodes-layer/constants";
import { GroupSerializable } from "./types";
import { Weave } from "./weave";
import { WeaveNodesSelectionPlugin } from "./plugins/nodes-selection/nodes-selection";

export class WeaveGroupsManager {
  protected instance!: Weave;

  constructor(instance: Weave) {
    this.instance = instance;
  }

  handleStateChange({ action, value }: GroupsStateChange) {
    const stage = this.instance.getStage();
    const nodesLayer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer;

    if (nodesLayer) {
      switch (action) {
        case STATE_ACTIONS.CREATE: {
          this.addRuntime(value);
          break;
        }
        case STATE_ACTIONS.UPDATE: {
          this.updateRuntime(value);
          break;
        }
        case STATE_ACTIONS.DELETE: {
          this.removeRuntime(value);
          break;
        }
      }
    }
  }

  add(group: GroupSerializable) {
    const state = this.instance.getStore().getState();

    if (!state.weave.groups) {
      state.weave.groups = {};
    }

    if (state.weave.groups[group.id]) {
      return;
    }

    state.weave.groups[group.id] = group;
  }

  update(group: GroupSerializable) {
    const state = this.instance.getStore().getState();

    if (!state.weave.groups) {
      state.weave.groups = {};
    }

    if (!state.weave.groups[group.id]) {
      return;
    }

    state.weave.groups[group.id] = {
      ...JSON.parse(JSON.stringify(state.weave.groups[group.id])),
      ...group,
    };
  }

  remove(group: GroupSerializable) {
    const state = this.instance.getStore().getState();

    if (!state.weave.nodes) {
      state.weave.nodes = {};
    }

    if (!state.weave.groups) {
      state.weave.groups = {};
    }

    if (!state.weave.groups[group.id]) {
      return;
    }

    for (const nodeId of state.weave.groups[group.id].nodes) {
      delete state.weave.nodes[nodeId];
    }

    delete state.weave.groups[group.id];
  }

  addRuntime(groupParams: GroupSerializable) {
    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();
    const nodesLayer = this.getNodesLayer();

    const { id, groupId } = groupParams;

    const group = stage.findOne(`#${id}`) as Konva.Group;
    if (group) {
      return;
    }

    const newGroupParams = {
      ...groupParams,
    };
    delete newGroupParams.zIndex;

    const newGroup = new Konva.Group({
      ...newGroupParams,
    });

    let addedToGroup = false;
    if (groupId) {
      let parentGroup = nodesLayer.findOne(`#${groupParams.groupId}`) as Konva.Layer | Konva.Group | undefined;
      if (!parentGroup) {
        let element: NodeSerializable | GroupSerializable | undefined = state.weave.groups?.[groupParams.groupId];
        if (!element) {
          for (const nodeId of Object.keys(state.weave.nodes ?? {})) {
            const actualNode = state.weave.nodes?.[nodeId];
            if (actualNode?.containerId === groupParams.groupId) {
              element = actualNode;
              break;
            }
          }
        }

        if (element) {
          if (element.type === "group") {
            this.instance.getGroupsManager().addRuntime(element as GroupSerializable);
          }
          if (element.type !== "group") {
            this.instance.getNodesManager().addRuntime(element as NodeSerializable);
          }
        }
      }
      parentGroup = nodesLayer.findOne(`#${groupParams.groupId}`) as Konva.Layer | Konva.Group | undefined;
      if (parentGroup) {
        if (parentGroup.getAttrs().containerId) {
          const nodePos = newGroup.getAbsolutePosition();
          const nodeRotation = newGroup.getAbsoluteRotation();

          newGroup.moveTo(parentGroup);
          newGroup.setAbsolutePosition(nodePos);
          newGroup.rotation(nodeRotation);
        } else {
          parentGroup.add(newGroup);
          addedToGroup = true;
        }

        addedToGroup = true;
      }
    }
    if (!addedToGroup) {
      nodesLayer.add(newGroup);
    }

    newGroup.on("dragmove", () => {
      this.instance.updateElement(newGroup.getAttrs() as GroupSerializable);
    });
    newGroup.on("dragend", () => {
      this.instance.updateElement(newGroup.getAttrs() as GroupSerializable);
    });

    newGroup.zIndex(groupParams.zIndex);
  }

  private updateRuntime(groupParams: GroupSerializable) {
    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();
    const nodesLayer = this.getNodesLayer();

    const { id, groupId } = groupParams;

    const group = stage.findOne(`#${id}`) as Konva.Group;

    if (!group) {
      return;
    }

    group.setAttrs(groupParams);

    let addedToGroup = false;
    if (groupId) {
      let parentGroup = nodesLayer.findOne(`#${groupParams.groupId}`) as Konva.Group | undefined;
      if (!parentGroup) {
        let element: NodeSerializable | GroupSerializable | undefined = state.weave.groups?.[groupParams.groupId];
        if (!element) {
          for (const nodeId of Object.keys(state.weave.nodes ?? {})) {
            const actualNode = state.weave.nodes?.[nodeId];
            if (actualNode?.containerId === groupParams.groupId) {
              element = actualNode;
              break;
            }
          }
        }

        if (element) {
          if (element.type === "group") {
            this.instance.getGroupsManager().addRuntime(element as GroupSerializable);
          }
          if (element.type !== "group") {
            this.instance.getNodesManager().addRuntime(element as NodeSerializable);
          }
        }
      }
      parentGroup = nodesLayer.findOne(`#${groupParams.groupId}`) as Konva.Layer | Konva.Group | undefined;
      if (parentGroup) {
        if (parentGroup.getAttrs().containerId) {
          const nodePos = group.getAbsolutePosition();
          const nodeRotation = group.getAbsoluteRotation();

          group.moveTo(parentGroup);
          group.setAbsolutePosition(nodePos);
          group.rotation(nodeRotation);
        } else {
          parentGroup.add(group);
          addedToGroup = true;
        }

        addedToGroup = true;
      }
    }
    if (!addedToGroup) {
      nodesLayer.add(group);
    }

    group.zIndex(groupParams.zIndex);
  }

  private removeRuntime(groupParams: GroupSerializable) {
    const stage = this.instance.getStage();

    const { id } = groupParams;

    const group = stage.findOne(`#${id}`) as Konva.Group;
    group?.destroy();
  }

  private getNodesLayer() {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer;
    return layer;
  }

  group(nodes: (NodeSerializable | GroupSerializable)[]) {
    const stage = this.instance.getStage();

    if (nodes.length === 0) {
      return;
    }

    const groupId = uuidv4();

    const { allInSame, parentId } = this.instance.allNodesInSameParent(nodes);

    if (!allInSame) {
      return;
    }

    const nodesWithZIndex = nodes
      .map((node) => {
        const konvaNode = stage.findOne(`#${node.id}`) as Konva.Node | undefined;
        return { node, zIndex: konvaNode?.zIndex() ?? -1 };
      })
      .filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(nodesWithZIndex, ["zIndex"], ["asc"]).map((node) => node.node);

    const konvaParent: Konva.Layer | Konva.Group | undefined = parentId
      ? (stage.findOne(`#${parentId}`) as Konva.Group | undefined)
      : this.getNodesLayer();

    console.log("GROUP PARENT", konvaParent);

    this.instance.addElement({
      id: groupId,
      groupId: parentId,
      type: "group",
      nodes: nodes.map((node) => node.id),
      isSelectable: true,
      draggable: true,
    });

    const konvaNewGroup = stage.findOne(`#${groupId}`) as Konva.Layer | Konva.Group | undefined;

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      if (node.type === "group") {
        const groupNode = node as GroupSerializable;
        const konvaGroup = stage.findOne(`#${groupNode.id}`) as Konva.Group | undefined;
        if (konvaGroup) {
          const nodePos = konvaGroup.getAbsolutePosition();
          const nodeRotation = konvaGroup.getAbsoluteRotation();

          konvaGroup.moveTo(konvaNewGroup);
          konvaGroup.setAbsolutePosition(nodePos);
          konvaGroup.rotation(nodeRotation);

          this.instance.updateElement({
            ...(konvaGroup.getAttrs() as GroupSerializable),
            groupId,
            isSelectable: false,
            draggable: false,
            zIndex: index,
          });
        }
        continue;
      }

      const konvaNode = stage.findOne(`#${node.id}`) as Konva.Node | undefined;
      if (konvaNode) {
        const nodePos = konvaNode.getAbsolutePosition();
        const nodeRotation = konvaNode.getAbsoluteRotation();

        konvaNode.moveTo(konvaNewGroup);
        konvaNode.setAbsolutePosition(nodePos);
        konvaNode.rotation(nodeRotation);

        this.instance.updateElement({
          ...(konvaNode.getAttrs() as NodeSerializable),
          groupId,
          isSelectable: false,
          draggable: false,
          zIndex: index,
        });
      }
    }

    this.instance.updateElement({
      id: groupId,
      groupId: parentId,
      type: "group",
      zIndex: (konvaParent?.getChildren().length ?? 0) - 1,
    });

    const newGroupNode = stage.findOne(`#${groupId}`) as Konva.Group | undefined;
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (newGroupNode && selectionPlugin) {
      selectionPlugin.setSelectedNodes([newGroupNode]);
    }
  }

  unGroup(group: GroupSerializable) {
    const stage = this.instance.getStage();
    const konvaGroup = stage.findOne(`#${group.id}`) as Konva.Group | undefined;

    if (!konvaGroup) {
      return;
    }

    console.log(konvaGroup.getAttrs().groupId);

    let newLayer: Konva.Layer | Konva.Group | undefined = this.getNodesLayer();
    if (konvaGroup.getAttrs().groupId) {
      newLayer = stage.findOne(`#${konvaGroup.getAttrs().groupId}`) as Konva.Group | undefined;
    }

    console.log(newLayer);

    if (!newLayer) {
      return;
    }

    const newLayerChildrenAmount = newLayer?.getChildren().length ?? 0;

    for (const nodeId of group.nodes) {
      const konvaNode = stage.findOne(`#${nodeId}`) as Konva.Node | undefined;
      if (konvaNode && konvaNode.getAttrs().type === "group") {
        const nodePos = konvaNode.getAbsolutePosition();
        const nodeRotation = konvaNode.getAbsoluteRotation();

        konvaNode.moveTo(newLayer);
        konvaNode.setAbsolutePosition(nodePos);
        konvaNode.rotation(nodeRotation);

        this.instance.updateElement({
          ...(konvaNode.getAttrs() as GroupSerializable),
          groupId: konvaGroup.getAttrs().groupId,
          isSelectable: true,
          draggable: true,
          zIndex: newLayerChildrenAmount - 1 + konvaNode.zIndex(),
        });
      }
      if (konvaNode && konvaNode.getAttrs().type !== "group") {
        const nodePos = konvaNode.getAbsolutePosition();
        const nodeRotation = konvaNode.getAbsoluteRotation();

        konvaNode.moveTo(newLayer);
        konvaNode.setAbsolutePosition(nodePos);
        konvaNode.rotation(nodeRotation);

        this.instance.updateElement({
          ...(konvaNode.getAttrs() as NodeSerializable),
          groupId: konvaGroup.getAttrs().groupId,
          isSelectable: true,
          draggable: true,
          zIndex: newLayerChildrenAmount - 1 + konvaNode.zIndex(),
        });
      }
    }

    this.instance.updateElement({
      id: group.id,
      type: "group",
      nodes: [],
    });

    this.instance.removeElement({
      id: group.id,
      type: "group",
      nodes: [],
    });

    const firstElement = stage.findOne(`#${group.nodes[0]}`) as Konva.Node | undefined;
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (firstElement && selectionPlugin) {
      selectionPlugin.setSelectedNodes([firstElement]);
    }
  }
}
