// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { TreeView, TreeDataItem } from "@/components/ui/tree-view";
import { WeaveSelection, WeaveStateElement } from "@inditextech/weave-types";
import React from "react";
import { useCollaborationRoom } from "@/store/store";
import { useWeave } from "@inditextech/weave-react";
import { Frame, Spline, Image, Square, Tag, Type, X } from "lucide-react";
import { Weave } from "@inditextech/weave-sdk";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconsMap: Record<string, any> = {
  rectangle: Square,
  text: Type,
  image: Image,
  frame: Frame,
  "color-token": Tag,
  line: Spline,
};

function mapElementsToTree(
  instance: Weave,
  elements: WeaveStateElement[],
  selectedNodes: string[]
) {
  const elementsMapped = elements.map((element) => {
    return {
      id: element.key,
      icon: iconsMap[element.props.nodeType ?? "rectangle"],
      name: element.key,
      ...((element.props.children ?? []).length > 0 && {
        children: mapElementsToTree(
          instance,
          element.props.children ?? [],
          selectedNodes
        ),
      }),
    } as TreeDataItem;
  }) as TreeDataItem[];

  return elementsMapped;
}

export const ElementsTree = () => {
  const instance = useWeave((state) => state.instance);
  const initialSelectedNodes = useWeave((state) => state.selection.nodes);

  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const [elementsTree, setElementsTree] = React.useState<WeaveStateElement[]>(
    []
  );
  const [selectedNodes, setSelectedNodes] = React.useState<string[]>(
    initialSelectedNodes.map((node) => node.node.key)
  );

  React.useEffect(() => {
    function handleOnStateChange() {
      if (!instance) return [];

      const nodesTree = instance.getElementsTree();
      setElementsTree(nodesTree);
    }

    if (instance) {
      instance.addEventListener("onStateChange", handleOnStateChange);
      setElementsTree(instance.getElementsTree());
    }

    return () => {
      if (instance) {
        instance.removeEventListener("onStateChange", handleOnStateChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarLeftActive]);

  React.useEffect(() => {
    function handleOnNodesSelectedChange(nodes: WeaveSelection[]) {
      setSelectedNodes(nodes.map((node) => node.node.key));
    }

    if (instance) {
      instance.addEventListener("onNodesChange", handleOnNodesSelectedChange);
    }

    return () => {
      if (instance) {
        instance.removeEventListener(
          "onNodesChange",
          handleOnNodesSelectedChange
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarLeftActive]);

  const treeData = React.useMemo<TreeDataItem[]>(() => {
    if (!instance) return [];

    return mapElementsToTree(instance, elementsTree, selectedNodes);
  }, [instance, elementsTree, selectedNodes]);

  if (!instance) {
    return null;
  }

  if (sidebarLeftActive !== SIDEBAR_ELEMENTS.nodesTree) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-auto w-full h-full">
        <div className="w-full font-title-xs p-1 bg-white flex justify-between items-center">
          <div className="flex h-[32px] justify-between font-questrial font-light items-center text-md pl-2">
            Elements
          </div>
          <div className="flex justify-end items-center gap-1">
            <button
              className="cursor-pointer bg-transparent hover:bg-accent p-2"
              onClick={() => {
                setSidebarActive(null);
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full h-[calc(100%-50px)] border-t border-zinc-200 p-2">
          {elementsTree.length === 0 && (
            <div className="col-span-2 w-full flex flex-col justify-center items-center text-sm py-5 text-center">
              <b>No elements created</b>
              <span className="text-xs">Add an element to the whiteboard</span>
            </div>
          )}
          {elementsTree.length > 0 && (
            <TreeView
              data={treeData}
              initialSelectedItems={selectedNodes}
              onSelectedItemsChange={(items: string[]) => {
                instance.selectNodesByKey(items);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};
