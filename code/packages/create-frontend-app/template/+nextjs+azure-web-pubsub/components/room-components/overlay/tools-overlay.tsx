// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import { ToolbarButton } from "../toolbar/toolbar-button";
import { useMutation } from "@tanstack/react-query";
import { postImage } from "@/api/post-image";
import {
  Brush,
  ImagePlus,
  PenTool,
  Square,
  Type,
  Frame,
  MousePointer,
  Hand,
  Tags,
  Images,
  Projector,
  SwatchBook,
  ListTree,
  Undo,
  Redo,
  X,
  Ellipsis,
} from "lucide-react";
import { useWeave } from "@inditextech/weave-react";
import { Toolbar } from "../toolbar/toolbar";
import { motion } from "framer-motion";
import { topElementVariants } from "./variants";
import { SidebarActive, useCollaborationRoom } from "@/store/store";
import { ShortcutElement } from "../help/shortcut-element";
import { cn, SYSTEM_OS } from "@/lib/utils";
import { useKeyboardHandler } from "../hooks/use-keyboard-handler";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";

function ToolbarDivider() {
  return (
    <div className="w-full justify-center items-center flex">
      <div className="w-[1px] h-[20px] bg-zinc-200 mx-1"></div>
    </div>
  );
}

const SIDEBAR_ICONS_MAP: Record<string, React.JSX.Element> = {
  [SIDEBAR_ELEMENTS.images]: <Images />,
  [SIDEBAR_ELEMENTS.frames]: <Projector />,
  [SIDEBAR_ELEMENTS.colorTokens]: <SwatchBook />,
  [SIDEBAR_ELEMENTS.nodesTree]: <ListTree />,
};

export function ToolsOverlay() {
  useKeyboardHandler();

  const [visibleButtonMenu, setVisibleButtonMenu] = React.useState(false);

  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const canUndo = useWeave((state) => state.undoRedo.canUndo);
  const canRedo = useWeave((state) => state.undoRedo.canRedo);

  const nodeCreateProps = useCollaborationRoom(
    (state) => state.nodeProperties.createProps
  );
  const room = useCollaborationRoom((state) => state.room);
  const showUI = useCollaborationRoom((state) => state.ui.show);
  const setUploadingImage = useCollaborationRoom(
    (state) => state.setUploadingImage
  );

  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const mutationUpload = useMutation({
    mutationFn: async (file: File) => {
      return await postImage(room ?? "", file);
    },
  });

  const setShowSelectFileImage = useCollaborationRoom(
    (state) => state.setShowSelectFileImage
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
    [instance, actualAction]
  );

  React.useEffect(() => {
    const onPasteExternalImage = async (item: ClipboardItem) => {
      let blob: Blob | null = null;
      if (item.types.includes("image/png")) {
        blob = await item.getType("image/png");
      }
      if (item.types.includes("image/jpeg")) {
        blob = await item.getType("image/jpeg");
      }
      if (item.types.includes("image/gif")) {
        blob = await item.getType("image/gif");
      }

      if (!blob) {
        return;
      }

      setUploadingImage(true);
      const file = new File([blob], "external.image");
      mutationUpload.mutate(file, {
        onSuccess: (data) => {
          const room = data.fileName.split("/")[0];
          const imageId = data.fileName.split("/")[1];

          const { finishUploadCallback } = instance?.triggerAction(
            "imageTool"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any;

          finishUploadCallback?.(
            `${process.env.NEXT_PUBLIC_API_ENDPOINT}/weavejs/rooms/${room}/images/${imageId}`
          );
        },
        onError: () => {
          console.error("Error uploading image");
        },
        onSettled: () => {
          setUploadingImage(false);
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
  }, [instance, mutationUpload, setShowSelectFileImage, setUploadingImage]);

  const sidebarToggle = React.useCallback(
    (element: SidebarActive) => {
      setSidebarActive(element);
      setVisibleButtonMenu(false);
    },
    [setSidebarActive]
  );

  if (!showUI) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={topElementVariants}
      className="pointer-events-none absolute left-4 right-4 bottom-4 flex flex-col gap-2 justify-center items-center"
    >
      <Toolbar orientation="horizontal">
        <ToolbarButton
          className="rounded-l-lg"
          icon={<Hand />}
          active={actualAction === "moveTool"}
          onClick={() => triggerTool("moveTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Move</p>
              <ShortcutElement
                variant="light"
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
          icon={<MousePointer />}
          active={actualAction === "selectionTool"}
          onClick={() => triggerTool("selectionTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Selection</p>
              <ShortcutElement
                variant="light"
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
          icon={<Square />}
          active={actualAction === "rectangleTool"}
          onClick={() => triggerTool("rectangleTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a rectangle</p>
              <ShortcutElement
                variant="light"
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
          icon={<PenTool />}
          active={actualAction === "penTool"}
          onClick={() => triggerTool("penTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a line</p>
              <ShortcutElement
                variant="light"
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
          icon={<Brush />}
          active={actualAction === "brushTool"}
          onClick={() => triggerTool("brushTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Free draw</p>
              <ShortcutElement
                variant="light"
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
          icon={<Type />}
          active={actualAction === "textTool"}
          onClick={() => triggerTool("textTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add text</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: "T",
                  [SYSTEM_OS.OTHER]: "t",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          icon={<ImagePlus />}
          active={actualAction === "imageTool"}
          onClick={() => {
            triggerTool("imageTool");
            setShowSelectFileImage(true);
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add an image</p>
              <ShortcutElement
                variant="light"
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
          icon={<Frame />}
          active={actualAction === "frameTool"}
          onClick={() => triggerTool("frameTool", nodeCreateProps)}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a frame</p>
              <ShortcutElement
                variant="light"
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
          icon={<Tags />}
          active={actualAction === "colorTokenTool"}
          onClick={() => triggerTool("colorTokenTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add color token reference</p>
              <ShortcutElement
                variant="light"
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
        <div className="relative">
          <ToolbarButton
            icon={
              sidebarLeftActive ? (
                SIDEBAR_ICONS_MAP[sidebarLeftActive]
              ) : (
                <Ellipsis />
              )
            }
            active={sidebarLeftActive !== null}
            onClick={() => {
              setVisibleButtonMenu(!visibleButtonMenu);
            }}
            label={
              <div className="flex gap-3 justify-start items-center">
                <p>More options</p>
              </div>
            }
            tooltipSide="top"
            tooltipAlign="center"
          />
          <div
            className={cn("absolute left-[-4px] bottom-[44px] hidden", {
              ["flex flex-col bg-white border border-zinc-200 p-1 rounded-xl rounded-b-none"]:
                visibleButtonMenu,
            })}
          >
            <ToolbarButton
              icon={<Images />}
              className="rounded-t-lg"
              active={sidebarLeftActive === SIDEBAR_ELEMENTS.images}
              onClick={() => {
                sidebarToggle(SIDEBAR_ELEMENTS.images);
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Images sidebar</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: "⌥ ⌘ R",
                      [SYSTEM_OS.OTHER]: "Alt Ctrl R",
                    }}
                  />
                </div>
              }
              tooltipSide="right"
              tooltipAlign="start"
            />
            <ToolbarButton
              icon={<Projector />}
              active={sidebarLeftActive === SIDEBAR_ELEMENTS.frames}
              onClick={() => {
                sidebarToggle(SIDEBAR_ELEMENTS.frames);
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Frames sidebar</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: "⌥ ⌘ F",
                      [SYSTEM_OS.OTHER]: "Alt Ctrl F",
                    }}
                  />
                </div>
              }
              tooltipSide="right"
              tooltipAlign="start"
            />
            <ToolbarButton
              icon={<SwatchBook />}
              active={sidebarLeftActive === SIDEBAR_ELEMENTS.colorTokens}
              onClick={() => {
                sidebarToggle(SIDEBAR_ELEMENTS.colorTokens);
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Color Tokens sidebar</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: "⌥ ⌘ O",
                      [SYSTEM_OS.OTHER]: "Alt Ctrl O",
                    }}
                  />
                </div>
              }
              tooltipSide="right"
              tooltipAlign="start"
            />
            <ToolbarButton
              icon={<ListTree />}
              active={sidebarLeftActive === SIDEBAR_ELEMENTS.nodesTree}
              onClick={() => {
                sidebarToggle(SIDEBAR_ELEMENTS.nodesTree);
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Elements sidebar</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: "⌥ ⌘ E",
                      [SYSTEM_OS.OTHER]: "Alt Ctrl E",
                    }}
                  />
                </div>
              }
              tooltipSide="right"
              tooltipAlign="start"
            />
            {sidebarLeftActive && (
              <ToolbarButton
                icon={<X />}
                onClick={() => {
                  sidebarToggle(null);
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Close sidebar</p>
                    <ShortcutElement
                      variant="light"
                      shortcuts={{
                        [SYSTEM_OS.MAC]: "⌥ ⌘ E",
                        [SYSTEM_OS.OTHER]: "Alt Ctrl E",
                      }}
                    />
                  </div>
                }
                tooltipSide="right"
                tooltipAlign="start"
              />
            )}
          </div>
        </div>
        <ToolbarDivider />
        <ToolbarButton
          icon={<Undo />}
          disabled={!canUndo}
          onClick={() => {
            if (instance) {
              const actualStore = instance.getStore();
              actualStore.undoStateStep();
            }
          }}
          label={
            <div className="flex flex-col gap-2 justify-start items-end">
              <p>Undo latest changes</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⇧ ⌘ ,",
                  [SYSTEM_OS.OTHER]: "⇧ Ctrl ,",
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          icon={<Redo />}
          className="rounded-r-lg"
          disabled={!canRedo}
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
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: "⇧ ⌘ .",
                  [SYSTEM_OS.OTHER]: "⇧ Ctrl .",
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
