import {
  Weave,
  WeaveContextMenuPlugin,
  WeaveCopyPasteNodesPlugin,
  WeaveExportNodeActionParams,
} from "@inditextech/weavejs-sdk";
import { WeaveSelection } from "@inditextech/weavejs-types";
import {
  Copy,
  ClipboardCopy,
  ClipboardPaste,
  Group,
  Ungroup,
  Trash,
  SendToBack,
  BringToFront,
  ArrowUp,
  ArrowDown,
  ImageDown,
} from "lucide-react";
import { useCollaborationRoom } from "@/store/store";
import React from "react";
import { ContextMenuOption } from "@/components/context-menu/context-menu";

function useContextMenu() {
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow
  );
  const setContextMenuPosition = useCollaborationRoom(
    (state) => state.setContextMenuPosition
  );
  const setContextMenuOptions = useCollaborationRoom(
    (state) => state.setContextMenuOptions
  );

  const getContextMenu = React.useCallback(
    ({
      actInstance,
      actActionActive,
      canUnGroup,
      nodes,
      canGroup,
    }: {
      actInstance: Weave;
      actActionActive: string | undefined;
      canUnGroup: boolean;
      canGroup: boolean;
      nodes: WeaveSelection[];
    }): ContextMenuOption[] => {
      const options: ContextMenuOption[] = [];

      if (nodes.length > 0) {
        // DUPLICATE
        options.push({
          id: "duplicate",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Duplicate</div>
            </div>
          ),
          icon: <Copy size={16} />,
          disabled: nodes.length > 1,
          onClick: async () => {
            if (nodes.length === 1) {
              const weaveCopyPasteNodesPlugin =
                actInstance.getPlugin<WeaveCopyPasteNodesPlugin>(
                  "copyPasteNodes"
                );
              if (weaveCopyPasteNodesPlugin) {
                await weaveCopyPasteNodesPlugin.copy();
                weaveCopyPasteNodesPlugin.paste();
              }
              setContextMenuShow(false);
            }
          },
        });
      }
      if (nodes.length > 0) {
        // SEPARATOR
        options.push({
          id: "div--1",
          type: "divider",
        });
      }
      if (nodes.length > 0) {
        // EXPORT
        options.push({
          id: "export",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Export as image</div>
            </div>
          ),
          icon: <ImageDown size={16} />,
          disabled: nodes.length > 1,
          onClick: () => {
            if (nodes.length === 1) {
              actInstance.triggerAction<WeaveExportNodeActionParams>(
                "exportNodeTool",
                {
                  node: nodes[0].instance,
                  options: {
                    padding: 20,
                    pixelRatio: 2,
                  },
                }
              );
            }
            setContextMenuShow(false);
          },
        });
      }
      if (nodes.length > 0) {
        // SEPARATOR
        options.push({
          id: "div-0",
          type: "divider",
        });
        // COPY
      }
      // COPY
      options.push({
        id: "copy",
        type: "button",
        label: (
          <div className="w-full flex justify-between items-center">
            <div>Copy</div>
          </div>
        ),
        icon: <ClipboardCopy size={16} />,
        disabled: !["selectionTool"].includes(actActionActive ?? ""),
        onClick: async () => {
          const weaveCopyPasteNodesPlugin =
            actInstance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
          if (weaveCopyPasteNodesPlugin) {
            await weaveCopyPasteNodesPlugin.copy();
          }
          setContextMenuShow(false);
        },
      });
      // PASTE
      options.push({
        id: "paste",
        type: "button",
        label: (
          <div className="w-full flex justify-between items-center">
            <div>Paste</div>
          </div>
        ),
        icon: <ClipboardPaste size={16} />,
        disabled: !["selectionTool"].includes(actActionActive ?? ""),
        onClick: () => {
          const weaveCopyPasteNodesPlugin =
            actInstance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
          if (weaveCopyPasteNodesPlugin) {
            return weaveCopyPasteNodesPlugin.paste();
          }
          setContextMenuShow(false);
        },
      });
      if (nodes.length > 0) {
        // SEPARATOR
        options.push({
          id: "div-1",
          type: "divider",
        });
      }
      if (nodes.length > 0) {
        // BRING TO FRONT
        options.push({
          id: "bring-to-front",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Bring to front</div>
            </div>
          ),
          icon: <BringToFront size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            actInstance.bringToFront(nodes[0].instance);
            setContextMenuShow(false);
          },
        });
        // MOVE UP
        options.push({
          id: "move-up",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Move up</div>
            </div>
          ),
          icon: <ArrowUp size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            actInstance.moveUp(nodes[0].instance);
            setContextMenuShow(false);
          },
        });
        // MOVE DOWN
        options.push({
          id: "move-down",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Move down</div>
            </div>
          ),
          icon: <ArrowDown size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            actInstance.moveDown(nodes[0].instance);
            setContextMenuShow(false);
          },
        });
        // SEND TO BACK
        options.push({
          id: "send-to-back",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Send to back</div>
            </div>
          ),
          icon: <SendToBack size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            actInstance.sendToBack(nodes[0].instance);
            setContextMenuShow(false);
          },
        });
      }
      if (nodes.length > 0) {
        options.push({
          id: "div-2",
          type: "divider",
        });
      }
      if (nodes.length > 0) {
        // GROUP
        options.push({
          id: "group",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Group</div>
            </div>
          ),
          icon: <Group size={16} />,
          disabled: !canGroup,
          onClick: () => {
            actInstance.group(nodes.map((n) => n.node));
            setContextMenuShow(false);
          },
        });
        // UNGROUP
        options.push({
          id: "ungroup",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Un-group</div>
            </div>
          ),
          icon: <Ungroup size={16} />,
          disabled: !canUnGroup,
          onClick: () => {
            actInstance.unGroup(nodes[0].node);
            setContextMenuShow(false);
          },
        });
      }
      if (nodes.length > 0) {
        // SEPARATOR
        options.push({
          id: "div-3",
          type: "divider",
        });
      }
      if (nodes.length > 0) {
        // DELETE
        options.push({
          id: "delete",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Delete</div>
            </div>
          ),
          icon: <Trash size={16} />,
          onClick: () => {
            for (const node of nodes) {
              actInstance.removeNode(node.node);
            }

            setContextMenuShow(false);
          },
        });
      }

      return options;
    },
    [setContextMenuShow]
  );

  const onNodeMenu = React.useCallback(
    (
      actInstance: Weave,
      nodes: WeaveSelection[],
      point: { x: number; y: number },
      visible: boolean
    ) => {
      const canGroup = nodes.length > 1;
      const canUnGroup = nodes.length === 1 && nodes[0].node.type === "group";

      const actActionActive = actInstance.getActiveAction();

      setContextMenuShow(visible);
      setContextMenuPosition(point);

      const contextMenu = getContextMenu({
        actInstance,
        actActionActive,
        canUnGroup,
        nodes,
        canGroup,
      });
      setContextMenuOptions(contextMenu);
    },
    [
      getContextMenu,
      setContextMenuOptions,
      setContextMenuPosition,
      setContextMenuShow,
    ]
  );

  const contextMenu = React.useMemo(
    () =>
      new WeaveContextMenuPlugin(
        {
          xOffset: 10,
          yOffset: 10,
        },
        {
          onNodeMenu,
        }
      ),
    [onNodeMenu]
  );

  return { contextMenu };
}

export default useContextMenu;
