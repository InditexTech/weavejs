'use client';

import React from 'react';
import { ContextMenuRender } from '@/components/room-components/context-menu';
import { useCollaborationRoom } from '@/store/store';
import { RoomHeader } from '@/components/room-components/overlay/room-header';
import { ToolsOverlay } from '@/components/room-components/overlay/tools-overlay';
import { useWeave, useWeaveEvents } from '@inditextech/weave-react';
import { WEAVE_INSTANCE_STATUS } from '@inditextech/weave-types';
import { Logo } from '../utils/logo';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ImagesLibrary } from '../room-components/images-library/images-library';
import { FramesLibrary } from '../room-components/frames-library/frames-library';
import { ColorTokensLibrary } from '../room-components/color-tokens-library/color-tokens-library';
import { ElementsTree } from '../room-components/elements-tree/elements-tree';
import { NodeProperties } from '../room-components/overlay/node-properties';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';
import { WeaveActionPropsChangeEvent } from '@inditextech/weave-sdk';
import useContextMenu from '../room-components/hooks/use-context-menu';
import useCopyPaste from '../room-components/hooks/use-copy-paste';

export const RoomLayout = () => {
  useWeaveEvents();
  useContextMenu();
  useCopyPaste();

  const instance = useWeave((state) => state.instance);
  const status = useWeave((state) => state.status);
  const roomLoaded = useWeave((state) => state.room.loaded);

  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const sidebarRightActive = useCollaborationRoom(
    (state) => state.sidebar.right.active
  );
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
  const setLoadingImage = useCollaborationRoom(
    (state) => state.setLoadingImage
  );
  const setNodePropertiesCreateProps = useCollaborationRoom(
    (state) => state.setNodePropertiesCreateProps
  );

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

    instance.addEventListener('onPropsChange', handlePropsChange);
    instance.addEventListener('onImageLoadStart', handleImageLoadStart);
    instance.addEventListener('onImageLoadEnd', handleImageLoadEnd);

    return () => {
      if (instance) {
        instance.removeEventListener('onPropsChange', handlePropsChange);
        instance.removeEventListener('onImageLoadStart', handlePropsChange);
        instance.removeEventListener('onImageLoadEnd', handlePropsChange);
      }
    };
  }, [instance, setLoadingImage, setNodePropertiesCreateProps]);

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
          className="w-full h-full flex flex-col"
        >
          <section className="w-full h-full flex">
            <section
              id="sidebar-left"
              className={cn(
                'bg-white h-full border-l border-zinc-200 shadow-md',
                {
                  ['w-0']: sidebarLeftActive === null,
                  ['w-[320px]']: sidebarLeftActive !== null,
                }
              )}
            >
              <AnimatePresence>
                <ImagesLibrary key={SIDEBAR_ELEMENTS.images} />
                <FramesLibrary key={SIDEBAR_ELEMENTS.frames} />
                <ColorTokensLibrary key={SIDEBAR_ELEMENTS.colorTokens} />
                <ElementsTree key={SIDEBAR_ELEMENTS.nodesTree} />
              </AnimatePresence>
            </section>
            <section
              className={cn('w-full h-full flex flex-col', {
                ['w-[calc(100%-320px)]']:
                  sidebarLeftActive !== null || sidebarRightActive !== null,
                ['w-[calc(100%-640px)]']:
                  sidebarLeftActive !== null && sidebarRightActive !== null,
              })}
            >
              <section className="w-full h-full flex relative">
                <RoomHeader />
                <div id="weave" className="w-full h-full overflow-hidden"></div>
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
                    <div className="absolute top-[88px] left-[12px] right-[12px] flex justify-center items-center pointer-events-none">
                      <div className="max-w-[320px] text-center bg-transparent bg-white/50 p-1 font-questrial text-[10px] text-zinc-600">
                        To pan the canvas, keep the mouse wheel or the space bar
                        pressed while dragging or use the hand tool.
                      </div>
                    </div>
                    <ToolsOverlay />
                    {transformingImage && (
                      <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                        <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                          <Logo kind="large" variant="no-text" />
                          <div className="font-questrial text-base">
                            Removing background...
                          </div>
                        </div>
                      </div>
                    )}
                    {uploadingImage && (
                      <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                        <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                          <Logo kind="large" variant="no-text" />
                          <div className="font-questrial text-base">
                            Uploading image...
                          </div>
                        </div>
                      </div>
                    )}
                    {loadingImage && (
                      <div className="bg-black/25 flex justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                        <div className="flex flex-col gap-5 bg-white p-11 py-8 justify-center items-center">
                          <Logo kind="large" variant="no-text" />
                          <div className="font-questrial text-base">
                            Loading image...
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </section>
            <section
              id="sidebar-right"
              className={cn(
                'bg-white h-full border-l border-zinc-200 shadow-md',
                {
                  ['w-0']: sidebarRightActive === null,
                  ['w-[320px]']: sidebarRightActive !== null,
                }
              )}
            >
              <NodeProperties />
            </section>
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
