'use client';

import React from 'react';
import { ContextMenuRender } from '@/components/room-components/context-menu';
import { useCollaborationRoom } from '@/store/store';
import { RoomInformationOverlay } from '@/components/room-components/overlay/room-information-overlay';
import { RoomUsersOverlay } from '@/components/room-components/overlay/room-users-overlay';
import { ToolsOverlay } from '@/components/room-components/overlay/tools-overlay';
import { MultiuseOverlay } from '@/components/room-components/overlay/multiuse-overlay';
import { useWeave } from '@inditextech/weave-react';
import { WEAVE_INSTANCE_STATUS } from '@inditextech/weave-types';
import { ZoomHandlerOverlay } from '../room-components/overlay/zoom-handler-overlay';
import { Logo } from '../utils/logo';
import { AnimatePresence, motion } from 'framer-motion';

export const RoomLayout = () => {
  const status = useWeave((state) => state.status);
  const roomLoaded = useWeave((state) => state.room.loaded);

  const contextMenuShow = useCollaborationRoom(
    (state) => state.contextMenu.show
  );
  const contextMenuPosition = useCollaborationRoom(
    (state) => state.contextMenu.position
  );
  const contextMenuOptions = useCollaborationRoom(
    (state) => state.contextMenu.options
  );
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow
  );
  const transformingImage = useCollaborationRoom(
    (state) => state.images.transforming
  );
  const uploadingImage = useCollaborationRoom(
    (state) => state.images.uploading
  );
  const loadingImage = useCollaborationRoom((state) => state.images.loading);

  return (
    <div className="w-full h-full relative flex">
      <AnimatePresence>
        <motion.div
          animate={{
            filter: !(status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded)
              ? 'blur(10px)'
              : 'blur(0px)',
          }}
          transition={{
            duration: 0.5,
            delay: !(status === WEAVE_INSTANCE_STATUS.RUNNING && roomLoaded)
              ? 0
              : 0.5,
          }}
          className="w-full h-full"
        >
          <div id="weave" className="w-full h-full"></div>
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
              <RoomInformationOverlay />
              <div className="absolute top-[64px] left-[8px] right-[8px] flex justify-start items-center pointer-events-none">
                <div className="max-w-[320px] text-left bg-transparent bg-white/50 p-1 font-noto-sans-mono text-[10px] text-zinc-600">
                  To pan the canvas, keep the mouse wheel or the space bar
                  pressed while dragging or use the hand tool.
                </div>
              </div>
              <RoomUsersOverlay />
              <ToolsOverlay />
              <ZoomHandlerOverlay />
              <MultiuseOverlay />
              {transformingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-noto-sans-mono text-base">
                      Removing background...
                    </div>
                  </div>
                </div>
              )}
              {uploadingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-noto-sans-mono text-base">
                      Uploading image...
                    </div>
                  </div>
                </div>
              )}
              {loadingImage && (
                <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                  <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                    <Logo kind="large" variant="no-text" />
                    <div className="font-noto-sans-mono text-base">
                      Loading image...
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
