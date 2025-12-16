import {
  WeaveContextMenuPlugin,
  WeaveCopyPasteNodesPlugin,
  WeaveStageContextMenuPluginOnNodeContextMenuEvent,
} from "@inditextech/weave-sdk";
import { WeaveSelection } from "@inditextech/weave-types";
import { useCollaborationRoom } from "@/store/store";
import React from "react";
import { useWeave } from "@inditextech/weave-react";
import { ContextMenuOption } from "../context-menu";
import { ShortcutElement } from "../help/shortcut-element";
import { SYSTEM_OS } from "@/lib/utils";
import Konva from "konva";
import {
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postRemoveBackground } from "@/api/post-remove-background";

function useContextMenu() {
  const instance = useWeave((state) => state.instance);

  const room = useCollaborationRoom((state) => state.room);
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow,
  );
  const setContextMenuPosition = useCollaborationRoom(
    (state) => state.setContextMenuPosition,
  );
  const setContextMenuOptions = useCollaborationRoom(
    (state) => state.setContextMenuOptions,
  );
  const setTransformingImage = useCollaborationRoom(
    (state) => state.setTransformingImage,
  );
  const setExportNodes = useCollaborationRoom((state) => state.setExportNodes);
  const setExportConfigVisible = useCollaborationRoom(
    (state) => state.setExportConfigVisible,
  );

  const queryClient = useQueryClient();

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
      clickPoint,
      stageClickPoint,
    }: {
      actActionActive: string | undefined;
      canUnGroup: boolean;
      canGroup: boolean;
      nodes: WeaveSelection[];
      clickPoint: Konva.Vector2d;
      stageClickPoint: Konva.Vector2d;
    }): ContextMenuOption[] => {
      if (!instance) return [];

      const options: ContextMenuOption[] = [];

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
          disabled: nodes.length <= 0,
          onClick: () => {
            setExportNodes(nodes.map((n) => n.node?.key ?? ""));
            setExportConfigVisible(true);
            setContextMenuShow(false);
          },
        });
        // SEPARATOR
        options.push({
          id: "div-0",
          type: "divider",
        });

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
        options.push({
          id: "copy-as-image",
          type: "button",
          label: (
            <div className="w-full flex justify-between items-center">
              <div>Copy as image</div>
            </div>
          ),
          icon: <ClipboardCopy size={16} />,
          disabled: !["selectionTool"].includes(actActionActive ?? ""),
          onClick: async () => {
            setContextMenuShow(false);
            const weaveCopyPasteNodesPlugin =
              instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
            if (weaveCopyPasteNodesPlugin) {
              await weaveCopyPasteNodesPlugin.copy(true);
            }
          },
        });
      }
      // PASTE
      options.push({
        id: "paste",
        type: "button",
        label: (
          <div className="w-full flex justify-between items-center">
            <div>Paste here</div>
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
            weaveCopyPasteNodesPlugin.paste(clickPoint, stageClickPoint);
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
            const existingSelectedNodes = [];
            for (const n of nodes) {
              if (n.node) {
                existingSelectedNodes.push(n.node);
              }
            }
            instance.group(existingSelectedNodes);
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
            if (!nodes[0].node) return;
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
              if (node.node) {
                instance.removeNode(node.node);
              }
            }

            setContextMenuShow(false);
          },
        });
      }

      if (nodes.length === 1 && nodes[0]?.node?.type === "image") {
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
                  `#${nodeImage.getAttrs().id}-image`,
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

                    const queryKey = ["getImages", room];
                    queryClient.invalidateQueries({ queryKey });

                    const { finishUploadCallback } = instance.triggerAction(
                      "imageTool",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any;

                    finishUploadCallback(
                      `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${room}/images/${imageId}`,
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
    [
      queryClient,
      instance,
      mutationUpload,
      setTransformingImage,
      setContextMenuShow,
      setExportConfigVisible,
      setExportNodes,
    ],
  );

  const onNodeContextMenuHandler = React.useCallback(
    async ({
      selection,
      contextMenuPoint,
      clickPoint,
      stageClickPoint,
      visible,
    }: WeaveStageContextMenuPluginOnNodeContextMenuEvent) => {
      if (!instance) return;

      const canGroup = selection.length > 1;
      const canUnGroup =
        selection.length === 1 && selection[0]?.node?.type === "group";

      const actActionActive = instance.getActiveAction();

      const contextMenu = await getContextMenu({
        actActionActive,
        canUnGroup,
        nodes: selection,
        canGroup,
        clickPoint,
        stageClickPoint,
      });

      if (contextMenu.length > 0) {
        setContextMenuShow(visible);
        setContextMenuPosition(contextMenuPoint);
        setContextMenuOptions(contextMenu);
      } else {
        const contextMenuPlugin =
          instance?.getPlugin<WeaveContextMenuPlugin>("contextMenu");
        contextMenuPlugin?.closeContextMenu();
      }
    },
    [
      instance,
      getContextMenu,
      setContextMenuOptions,
      setContextMenuPosition,
      setContextMenuShow,
    ],
  );

  React.useEffect(() => {
    if (!instance) return;

    instance.addEventListener("onNodeContextMenu", onNodeContextMenuHandler);

    return () => {
      instance.removeEventListener(
        "onNodeContextMenu",
        onNodeContextMenuHandler,
      );
    };
  }, [instance, onNodeContextMenuHandler]);
}

export default useContextMenu;
