"use client";

import React from "react";
import { ContextMenuRender } from "@/components/room-components/context-menu";
import { useCollaborationRoom } from "@/store/store";
import { RoomHeader } from "@/components/room-components/overlay/room-header";
import { ToolsOverlay } from "@/components/room-components/overlay/tools-overlay";
import { useWeave, useWeaveEvents } from "@inditextech/weave-react";
import {
  WEAVE_INSTANCE_STATUS,
  WEAVE_STORE_CONNECTION_STATUS,
} from "@inditextech/weave-types";
import { Logo } from "../utils/logo";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImagesLibrary } from "../room-components/images-library/images-library";
import { FramesLibrary } from "../room-components/frames-library/frames-library";
import { ColorTokensLibrary } from "../room-components/color-tokens-library/color-tokens-library";
import { ElementsTree } from "../room-components/elements-tree/elements-tree";
import { NodeProperties } from "../room-components/overlay/node-properties";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";
import { WeaveActionPropsChangeEvent } from "@inditextech/weave-sdk";
import useContextMenu from "../room-components/hooks/use-context-menu";
import useCopyPaste from "../room-components/hooks/use-copy-paste";
import { ExportConfigDialog } from "../room-components/overlay/export-config";

export const RoomLayout = () => {
  useWeaveEvents();
  useContextMenu();
  useCopyPaste();

  const instance = useWeave((state) => state.instance);
  const status = useWeave((state) => state.status);
  const roomLoaded = useWeave((state) => state.room.loaded);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);

  const contextMenuShow = useCollaborationRoom(
    (state) => state.contextMenu.show,
  );
  const contextMenuPosition = useCollaborationRoom(
    (state) => state.contextMenu.position,
  );
  const contextMenuOptions = useCollaborationRoom(
    (state) => state.contextMenu.options,
  );
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow,
  );
  const transformingImage = useCollaborationRoom(
    (state) => state.images.transforming,
  );
  const uploadingImage = useCollaborationRoom(
    (state) => state.images.uploading,
  );
  const loadingImage = useCollaborationRoom((state) => state.images.loading);
  const setLoadingImage = useCollaborationRoom(
    (state) => state.setLoadingImage,
  );
  const setNodePropertiesCreateProps = useCollaborationRoom(
    (state) => state.setNodePropertiesCreateProps,
  );

  React.useEffect(() => {
    if (!instance) return;

    if (status !== WEAVE_INSTANCE_STATUS.RUNNING) return;

    if (!roomLoaded) return;

    const elementsTree = instance.getElementsTree();
    if (elementsTree.length === 0) {
      const stage = instance.getStage();
      stage.x(stage.width() / 2);
      stage.y(stage.height() / 2);
    } else {
      instance.triggerAction("fitToScreenTool", {
        previousAction: "selectionTool",
      });
    }
  }, [instance, status, roomLoaded]);

  React.useEffect(() => {
    if (!instance) return;

    const handlePropsChange = ({ props }: WeaveActionPropsChangeEvent) => {
      setNodePropertiesCreateProps(props);
    };

    const handleImageLoadStart = () => {
      setLoadingImage(true);
    };

    const handleImageLoadEnd = () => {
      setLoadingImage(false);
    };

    instance.addEventListener("onPropsChange", handlePropsChange);
    instance.addEventListener("onImageLoadStart", handleImageLoadStart);
    instance.addEventListener("onImageLoadEnd", handleImageLoadEnd);

    return () => {
      if (instance) {
        instance.removeEventListener("onPropsChange", handlePropsChange);
        instance.removeEventListener("onImageLoadStart", handlePropsChange);
        instance.removeEventListener("onImageLoadEnd", handlePropsChange);
      }
    };
  }, [instance, setLoadingImage, setNodePropertiesCreateProps]);

  return (
    <AnimatePresence>
      <motion.div
        // animate={{
        //   filter: !(status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded)
        //     ? "blur(10px)"
        //     : "blur(0px)",
        // }}
        transition={{
          duration: 0.5,
          delay: !(status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded)
            ? 0
            : 0.5,
        }}
        className="w-full h-full flex flex-col relative overflow-hidden"
      >
        <section className="absolute w-[calc(100%-370px)] top-0 left-0 right-0 bottom-0 flex z-0 overflow-hidden">
          <RoomHeader />
          <div
            id="weave"
            tabIndex={0}
            className={cn("w-full h-full relative overflow-hidden", {
              ["pointer-events-none"]:
                weaveConnectionStatus !==
                  WEAVE_STORE_CONNECTION_STATUS.CONNECTED ||
                status !== WEAVE_INSTANCE_STATUS.RUNNING ||
                !roomLoaded,
              ["pointer-events-auto"]:
                status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded,
            })}
          ></div>
          {weaveConnectionStatus !==
            WEAVE_STORE_CONNECTION_STATUS.CONNECTED && (
            <div className="absolute top-0 left-0 right-0 bottom-0">
              <div className="w-full h-full bg-black/50 flex justify-center items-center pointer-events-none">
                <div className="bg-white p-8 flex justify-center items-center flex-col gap-2">
                  <div className="text-2xl font-inter font-light uppercase">
                    CONNECTING
                  </div>
                  <div className="text-xl font-inter font-light text-muted-foreground">
                    Please wait...
                  </div>
                </div>
              </div>
            </div>
          )}
          {status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded && (
            <>
              <ContextMenuRender
                show={contextMenuShow}
                onChanged={(show: boolean) => {
                  setContextMenuShow(show);
                }}
                position={contextMenuPosition}
                options={contextMenuOptions}
              />
              <ToolsOverlay />
              {transformingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-inter text-base">
                      Removing background...
                    </div>
                  </div>
                </div>
              )}
              {uploadingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-inter text-base">
                      Uploading image...
                    </div>
                  </div>
                </div>
              )}
              {loadingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-inter text-base">Loading image...</div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <section
          id="sidebar-right"
          className={cn(
            "w-[370px] bg-white absolute top-0 right-0 bottom-0 border-l border-[#c9c9c9] z-0 overflow-hidden",
          )}
        >
          <NodeProperties key={SIDEBAR_ELEMENTS.nodeProperties} />
          <ImagesLibrary key={SIDEBAR_ELEMENTS.images} />
          <FramesLibrary key={SIDEBAR_ELEMENTS.frames} />
          <ColorTokensLibrary key={SIDEBAR_ELEMENTS.colorTokens} />
          <ElementsTree />
          {weaveConnectionStatus !==
            WEAVE_STORE_CONNECTION_STATUS.CONNECTED && (
            <div className="absolute top-0 left-0 right-0 bottom-0">
              <div className="w-full h-full bg-black/50 flex justify-center items-center pointer-events-none"></div>
            </div>
          )}
        </section>
        {status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded && (
          <>
            <ExportConfigDialog />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
