// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveCopyPasteNodesPlugin,
  WeaveExportNodeActionParams,
  WeaveStageContextMenuPluginOnNodeContextMenuEvent,
} from "@inditextech/weave-sdk";
import { WeaveSelection } from "@inditextech/weave-types";
import { useCollaborationRoom } from "@/store/store";
import React from "react";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";
import { useWeave } from "@inditextech/weave-react";
import { ContextMenuOption } from "../context-menu";
import { ShortcutElement } from "../help/shortcut-element";
import { SYSTEM_OS } from "@/lib/utils";
import Konva from "konva";
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
  ImageMinus,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { postRemoveBackground } from "@/api/post-remove-background";

function useContextMenu() {
  const instance = useWeave((state) => state.instance);

  const room = useCollaborationRoom((state) => state.room);
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow
  );
  const setContextMenuPosition = useCollaborationRoom(
    (state) => state.setContextMenuPosition
  );
  const setContextMenuOptions = useCollaborationRoom(
    (state) => state.setContextMenuOptions
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );
  const setTransformingImage = useCollaborationRoom(
    (state) => state.setTransformingImage
  );

  const mutationUpload = useMutation({
    mutationFn: async (imageId: string) => {
      return await postRemoveBackground(room ?? "", imageId);
    },
  });

  const getContextMenu = React.useCallback(
    ({
      actActionActive,
      canUnGroup,
      nodes,
      canGroup,
    }: {
      actActionActive: string | undefined;
      canUnGroup: boolean;
      canGroup: boolean;
      nodes: WeaveSelection[];
    }): ContextMenuOption[] => {
      if (!instance) return [];

      const options: ContextMenuOption[] = [];

      if (nodes.length > 0) {
        // DUPLICATE
        options.push({
          id: "duplicate",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Duplicate</div>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⌘ D",
                  [SYSTEM_OS.OTHER]: "Ctrl D",
                }}
              />
            </div>
          ),
          icon: <Copy size={16} />,
          disabled: nodes.length > 1,
          onClick: async () => {
            if (nodes.length === 1) {
              const weaveCopyPasteNodesPlugin =
                instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⇧ ⌘ E",
                  [SYSTEM_OS.OTHER]: "⇧ Ctrl E",
                }}
              />
            </div>
          ),
          icon: <ImageDown size={16} />,
          disabled: nodes.length > 1,
          onClick: () => {
            if (nodes.length === 1) {
              instance.triggerAction<WeaveExportNodeActionParams>(
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
      }
      // COPY
      options.push({
        id: "copy",
        type: "button",
        label: (
          <div className="w-full flex justify-between items-center">
            <div>Copy</div>
            <ShortcutElement
              shortcuts={{
                [SYSTEM_OS.MAC]: "⌘ C",
                [SYSTEM_OS.OTHER]: "Ctrl C",
              }}
            />
          </div>
        ),
        icon: <ClipboardCopy size={16} />,
        disabled: !["selectionTool"].includes(actActionActive ?? ""),
        onClick: async () => {
          const weaveCopyPasteNodesPlugin =
            instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
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
            <ShortcutElement
              shortcuts={{
                [SYSTEM_OS.MAC]: "⌘ P",
                [SYSTEM_OS.OTHER]: "Ctrl P",
              }}
            />
          </div>
        ),
        icon: <ClipboardPaste size={16} />,
        disabled: !["selectionTool"].includes(actActionActive ?? ""),
        onClick: async () => {
          const weaveCopyPasteNodesPlugin =
            instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
          if (weaveCopyPasteNodesPlugin) {
            await weaveCopyPasteNodesPlugin.paste();
            setContextMenuShow(false);
          }
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "]",
                  [SYSTEM_OS.OTHER]: "]",
                }}
              />
            </div>
          ),
          icon: <BringToFront size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            instance.bringToFront(nodes[0].instance);
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⌘ ]",
                  [SYSTEM_OS.OTHER]: "Ctrl ]",
                }}
              />
            </div>
          ),
          icon: <ArrowUp size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            instance.moveUp(nodes[0].instance);
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⌘ [",
                  [SYSTEM_OS.OTHER]: "Ctrl [",
                }}
              />
            </div>
          ),
          icon: <ArrowDown size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            instance.moveDown(nodes[0].instance);
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "[",
                  [SYSTEM_OS.OTHER]: "[",
                }}
              />
            </div>
          ),
          icon: <SendToBack size={16} />,
          disabled: nodes.length !== 1,
          onClick: () => {
            instance.sendToBack(nodes[0].instance);
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⇧ ⌘ G",
                  [SYSTEM_OS.OTHER]: "⇧ Ctrl G",
                }}
              />
            </div>
          ),
          icon: <Group size={16} />,
          disabled: !canGroup,
          onClick: () => {
            instance.group(nodes.map((n) => n.node));
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⇧ ⌘ U",
                  [SYSTEM_OS.OTHER]: "⇧ Ctrl U",
                }}
              />
            </div>
          ),
          icon: <Ungroup size={16} />,
          disabled: !canUnGroup,
          onClick: () => {
            instance.unGroup(nodes[0].node);
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
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "Del",
                  [SYSTEM_OS.OTHER]: "Del",
                }}
              />
            </div>
          ),
          icon: <Trash size={16} />,
          onClick: () => {
            for (const node of nodes) {
              instance.removeNode(node.node);
            }

            setContextMenuShow(false);
          },
        });
      }

      if (nodes.length === 1 && nodes[0].node.type === "image") {
        options.unshift({
          id: "div-image",
          type: "divider",
        });
        options.unshift({
          id: "removeBackground",
          type: "button",
          label: "Remove background",
          icon: <ImageMinus size={16} />,
          onClick: () => {
            if (instance) {
              const nodeImage = nodes[0].instance as Konva.Group | undefined;
              if (nodeImage) {
                const nodeImageInternal = nodeImage?.findOne(
                  `#${nodeImage.getAttrs().id}-image`
                );
                const imageTokens = nodeImageInternal
                  ?.getAttr("image")
                  .src.split("/");
                const imageId = imageTokens[imageTokens.length - 1];
                setTransformingImage(true);
                mutationUpload.mutate(imageId, {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onSuccess: (data: any) => {
                    const room = data.fileName.split("/")[0];
                    const imageId = data.fileName.split("/")[1];

                    const { finishUploadCallback } = instance.triggerAction(
                      "imageTool"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any;

                    finishUploadCallback(
                      `${process.env.NEXT_PUBLIC_API_ENDPOINT}/weavejs/rooms/${room}/images/${imageId}`
                    );
                  },
                  onError: () => {
                    console.error("Error uploading image");
                  },
                  onSettled: () => {
                    setTransformingImage(false);
                  },
                });
              }
            }
            setContextMenuShow(false);
          },
        });
      }

      return options;
    },
    [mutationUpload, setTransformingImage, setContextMenuShow]
  );

  const onNodeContextMenuHandler = React.useCallback(
    ({
      selection,
      point,
      visible,
    }: WeaveStageContextMenuPluginOnNodeContextMenuEvent) => {
      if (!instance) return;

      const canGroup = selection.length > 1;
      const canUnGroup =
        selection.length === 1 && selection[0].node.type === "group";

      const actActionActive = instance.getActiveAction();

      if (visible) {
        setSidebarActive(SIDEBAR_ELEMENTS.nodeProperties, "right");
      }

      setContextMenuShow(visible);
      setContextMenuPosition(point);

      const contextMenu = getContextMenu({
        actActionActive,
        canUnGroup,
        nodes: selection,
        canGroup,
      });
      setContextMenuOptions(contextMenu);
    },
    [
      getContextMenu,
      setContextMenuOptions,
      setContextMenuPosition,
      setContextMenuShow,
      setSidebarActive,
    ]
  );

  React.useEffect(() => {
    if (!instance) return;

    instance.addEventListener("onNodeContextMenu", onNodeContextMenuHandler);

    return () => {
      instance.removeEventListener(
        "onNodeContextMenu",
        onNodeContextMenuHandler
      );
    };
  }, [instance, onNodeContextMenuHandler]);
}

export default useContextMenu;
