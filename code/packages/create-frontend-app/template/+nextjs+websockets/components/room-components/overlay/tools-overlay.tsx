"use client";

import React from "react";
import Konva from "konva";
import {
  WeaveImageToolActionOnAddedEvent,
  WeaveNode,
  WeaveNodesSelectionPlugin,
} from "@inditextech/weave-sdk";
import { ToolbarButton } from "../toolbar/toolbar-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postImage } from "@/api/post-image";
import {
  Brush,
  ImagePlus,
  Square,
  Type,
  Frame,
  MousePointer,
  Hand,
  Tags,
  Undo,
  Redo,
  Eraser,
  Circle,
  Hexagon,
  PenLine,
} from "lucide-react";
import { useWeave } from "@inditextech/weave-react";
import { Toolbar } from "../toolbar/toolbar";
import { motion } from "framer-motion";
import { topElementVariants } from "./variants";
import { useCollaborationRoom } from "@/store/store";
import { ShortcutElement } from "../help/shortcut-element";
import { isClipboardAPIAvailable, SYSTEM_OS } from "@/lib/utils";
import { useKeyboardHandler } from "../hooks/use-keyboard-handler";
import {
  WEAVE_STORE_CONNECTION_STATUS,
  WeaveElementInstance,
} from "@inditextech/weave-types";
import { toast } from "sonner";

function ToolbarDivider() {
  return (
    <div className="w-full justify-center items-center flex">
      <div className="w-[1px] h-[20px] bg-zinc-200 mx-1"></div>
    </div>
  );
}

export function ToolsOverlay() {
  const addImageRef = React.useRef<string | null>(null);
  const pastingToastIdRef = React.useRef<string | number | null>(null);

  const [positionCalculated, setPositionCalculated] =
    React.useState<boolean>(false);

  useKeyboardHandler();

  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const canUndo = useWeave((state) => state.undoRedo.canUndo);
  const canRedo = useWeave((state) => state.undoRedo.canRedo);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);

  const nodeCreateProps = useCollaborationRoom(
    (state) => state.nodeProperties.createProps,
  );
  const room = useCollaborationRoom((state) => state.room);
  const showUI = useCollaborationRoom((state) => state.ui.show);
  const setUploadingImage = useCollaborationRoom(
    (state) => state.setUploadingImage,
  );

  const queryClient = useQueryClient();

  const mutationUpload = useMutation({
    mutationFn: async (file: File) => {
      return await postImage(room ?? "", file);
    },
  });

  const setShowSelectFileImage = useCollaborationRoom(
    (state) => state.setShowSelectFileImage,
  );

  const triggerTool = React.useCallback(
    (toolName: string, params?: unknown) => {
      if (instance && actualAction !== toolName) {
        instance.triggerAction(toolName, params);
      }
      if (instance && actualAction === toolName) {
        instance.cancelAction(toolName);
      }
    },
    [instance, actualAction],
  );

  React.useEffect(() => {
    const onAddedImageHandler = ({ nodeId }: { nodeId: string }) => {
      setUploadingImage(false);

      if (!addImageRef.current) {
        return;
      }

      if (pastingToastIdRef.current) {
        toast.dismiss(pastingToastIdRef.current);
        pastingToastIdRef.current = null;
      }

      toast.success("Paste successful");

      if (!positionCalculated) {
        return;
      }

      const node = instance?.getStage().findOne(`#${nodeId}`);

      if (node) {
        node?.x(node.x() - node.width() / 2);
        node?.y(node.y() - node.height() / 2);

        const nodeHandle = instance?.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType,
        );

        if (nodeHandle) {
          instance?.updateNode(
            nodeHandle.serialize(node as WeaveElementInstance),
          );
        }

        const selectionPlugin =
          instance?.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
        if (selectionPlugin) {
          selectionPlugin.setSelectedNodes([node]);
        }

        instance?.triggerAction("fitToSelectionTool", {
          previousAction: "selectionTool",
          smartZoom: true,
        });
      }
    };

    instance?.addEventListener<WeaveImageToolActionOnAddedEvent>(
      "onAddedImage",
      onAddedImageHandler,
    );

    return () => {
      instance?.removeEventListener("onAddedImage", onAddedImageHandler);
    };
  }, [instance, positionCalculated, setUploadingImage]);

  React.useEffect(() => {
    const onPasteExternalImage = async ({
      positionCalculated,
      position,
      items,
      dataList,
    }: {
      positionCalculated: boolean;
      position: Konva.Vector2d;
      items?: ClipboardItems;
      dataList?: DataTransferItemList;
    }) => {
      if (items?.length === 0 && dataList?.length === 0) {
        return;
      }

      let blob: Blob | null = null;
      if (dataList && dataList.length === 1) {
        const item = dataList[0];
        if (item.type === "image/png" || item.type === "image/jpeg") {
          blob = await item.getAsFile();
        }
      }

      if (!blob && isClipboardAPIAvailable() && items?.length === 1) {
        const item = items[0];

        if (
          item.types.includes("image/png") &&
          !item.types.includes("text/plain")
        ) {
          blob = await item.getType("image/png");
        }
        if (
          item.types.includes("image/jpeg") &&
          !item.types.includes("text/plain")
        ) {
          blob = await item.getType("image/jpeg");
        }
        if (
          item.types.includes("image/gif") &&
          !item.types.includes("text/plain")
        ) {
          blob = await item.getType("image/gif");
        }
      }

      if (!blob) {
        return;
      }

      pastingToastIdRef.current = toast.loading("Pasting...");

      setUploadingImage(true);
      const file = new File([blob], "external.image");
      mutationUpload.mutate(file, {
        onSuccess: (data) => {
          const room: string = data.fileName.split("/")[0];
          const imageId = data.fileName.split("/")[1];

          const queryKey = ["getImages", room];
          queryClient.invalidateQueries({ queryKey });

          instance?.triggerAction(
            "imageTool",
            {
              position,
              forceMainContainer: true,
              imageURL: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${room}/images/${imageId}`,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any;

          addImageRef.current = imageId;

          setPositionCalculated(positionCalculated);
        },
        onError: (ex) => {
          console.error(ex);
          setUploadingImage(false);
          console.error("Error uploading image");
        },
      });
    };

    if (instance) {
      instance.addEventListener("onPasteExternal", onPasteExternalImage);
    }

    return () => {
      if (instance) {
        instance.removeEventListener("onPasteExternal", onPasteExternalImage);
      }
    };
  }, [
    instance,
    queryClient,
    mutationUpload,
    setShowSelectFileImage,
    setUploadingImage,
  ]);

  if (!showUI) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={topElementVariants}
      className="pointer-events-none absolute left-[16px] right-[16px] bottom-[16px] flex flex-col gap-2 justify-center items-center"
    >
      <Toolbar orientation="horizontal">
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Hand className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "moveTool"}
          onClick={() => triggerTool("moveTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Move</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "M",
                  [SYSTEM_OS.OTHER]: "M",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<MousePointer className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "selectionTool"}
          onClick={() => triggerTool("selectionTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Selection</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "S",
                  [SYSTEM_OS.OTHER]: "S",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Eraser className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "eraserTool"}
          onClick={() => triggerTool("eraserTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Erase</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "D",
                  [SYSTEM_OS.OTHER]: "D",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarDivider />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Square className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "rectangleTool"}
          onClick={() => triggerTool("rectangleTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a rectangle</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "R",
                  [SYSTEM_OS.OTHER]: "R",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Circle className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "ellipseTool"}
          onClick={() => triggerTool("ellipseTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a ellipsis</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "E",
                  [SYSTEM_OS.OTHER]: "E",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Hexagon className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "regularPolygonTool"}
          onClick={() => triggerTool("regularPolygonTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a regular polygon</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "P",
                  [SYSTEM_OS.OTHER]: "P",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<PenLine className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "lineTool"}
          onClick={() => triggerTool("lineTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a line</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "L",
                  [SYSTEM_OS.OTHER]: "L",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Brush className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "brushTool"}
          onClick={() => triggerTool("brushTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Free draw</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "B",
                  [SYSTEM_OS.OTHER]: "B",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Type className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "textTool"}
          onClick={() => triggerTool("textTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add text</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "T",
                  [SYSTEM_OS.OTHER]: "T",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<ImagePlus className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "imageTool"}
          onClick={() => {
            triggerTool("imageTool");
            setShowSelectFileImage(true);
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add an image</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "I",
                  [SYSTEM_OS.OTHER]: "I",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Frame className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "frameTool"}
          onClick={() => triggerTool("frameTool", nodeCreateProps)}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a frame</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "F",
                  [SYSTEM_OS.OTHER]: "F",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarDivider />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Tags className="px-2" size={40} strokeWidth={1} />}
          disabled={
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          active={actualAction === "colorTokenTool"}
          onClick={() => triggerTool("colorTokenTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add color token reference</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "P",
                  [SYSTEM_OS.OTHER]: "P",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarDivider />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Undo className="px-2" size={40} strokeWidth={1} />}
          disabled={
            !canUndo ||
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          onClick={() => {
            if (instance) {
              const actualStore = instance.getStore();
              actualStore.undoStateStep();
            }
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Undo latest changes</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⌘ Z",
                  [SYSTEM_OS.OTHER]: "Ctrl Z",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Redo className="px-2" size={40} strokeWidth={1} />}
          disabled={
            !canRedo ||
            weaveConnectionStatus !== WEAVE_STORE_CONNECTION_STATUS.CONNECTED
          }
          onClick={() => {
            if (instance) {
              const actualStore = instance.getStore();
              actualStore.redoStateStep();
            }
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Redo latest changes</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⌘ Y",
                  [SYSTEM_OS.OTHER]: "Ctrl Y",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
      </Toolbar>
    </motion.div>
  );
}
