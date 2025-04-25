'use client';

import React from 'react';
import { ToolbarButton } from '../toolbar/toolbar-button';
import { useMutation } from '@tanstack/react-query';
import { postImage } from '@/api/post-image';
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
} from 'lucide-react';
import { useWeave } from '@inditextech/weave-react';
import { Toolbar } from '../toolbar/toolbar';
import { motion } from 'framer-motion';
import { leftElementVariants } from './variants';
import { useCollaborationRoom } from '@/store/store';
import { ShortcutElement } from '../help/shortcut-element';
import { SYSTEM_OS } from '@/lib/utils';
import { useKeyboardHandler } from '../hooks/use-keyboard-handler';

export function ToolsOverlay() {
  useKeyboardHandler();

  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);

  const room = useCollaborationRoom((state) => state.room);
  const showUI = useCollaborationRoom((state) => state.ui.show);
  const setUploadingImage = useCollaborationRoom(
    (state) => state.setUploadingImage
  );

  const mutationUpload = useMutation({
    mutationFn: async (file: File) => {
      return await postImage(room ?? '', file);
    },
  });

  const setShowSelectFileImage = useCollaborationRoom(
    (state) => state.setShowSelectFileImage
  );

  const triggerTool = React.useCallback(
    (toolName: string) => {
      if (instance && actualAction !== toolName) {
        instance.triggerAction(toolName);
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
      if (item.types.includes('image/png')) {
        blob = await item.getType('image/png');
      }
      if (item.types.includes('image/jpeg')) {
        blob = await item.getType('image/jpeg');
      }
      if (item.types.includes('image/gif')) {
        blob = await item.getType('image/gif');
      }

      if (!blob) {
        return;
      }

      setUploadingImage(true);
      const file = new File([blob], 'external.image');
      mutationUpload.mutate(file, {
        onSuccess: (data) => {
          const room = data.fileName.split('/')[0];
          const imageId = data.fileName.split('/')[1];

          const { finishUploadCallback } = instance?.triggerAction(
            'imageTool'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any;

          finishUploadCallback?.(
            `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${room}/images/${imageId}`
          );
        },
        onError: () => {
          console.error('Error uploading image');
        },
        onSettled: () => {
          setUploadingImage(false);
        },
      });
    };

    if (instance) {
      instance.addEventListener('onPasteExternal', onPasteExternalImage);
    }

    return () => {
      if (instance) {
        instance.removeEventListener('onPasteExternal', onPasteExternalImage);
      }
    };
  }, [instance, mutationUpload, setShowSelectFileImage, setUploadingImage]);

  if (!showUI) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={leftElementVariants}
      className="pointer-events-none absolute top-[calc(50px+16px)] left-2 bottom-2 flex flex-col gap-2 justify-center items-center"
    >
      <Toolbar>
        <ToolbarButton
          icon={<Hand />}
          active={actualAction === 'moveTool'}
          onClick={() => triggerTool('moveTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Move</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'M',
                  [SYSTEM_OS.OTHER]: 'M',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<MousePointer />}
          active={actualAction === 'selectionTool'}
          onClick={() => triggerTool('selectionTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Selection</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'S',
                  [SYSTEM_OS.OTHER]: 'S',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<Square />}
          active={actualAction === 'rectangleTool'}
          onClick={() => triggerTool('rectangleTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a rectangle</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'R',
                  [SYSTEM_OS.OTHER]: 'R',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<PenTool />}
          active={actualAction === 'penTool'}
          onClick={() => triggerTool('penTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a line</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'L',
                  [SYSTEM_OS.OTHER]: 'L',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<Brush />}
          active={actualAction === 'brushTool'}
          onClick={() => triggerTool('brushTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Free draw</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'B',
                  [SYSTEM_OS.OTHER]: 'B',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<Type />}
          active={actualAction === 'textTool'}
          onClick={() => triggerTool('textTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add text</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'T',
                  [SYSTEM_OS.OTHER]: 't',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<ImagePlus />}
          active={actualAction === 'imageTool'}
          onClick={() => {
            triggerTool('imageTool');
            setShowSelectFileImage(true);
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add an image</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'I',
                  [SYSTEM_OS.OTHER]: 'I',
                }}
              />
            </div>
          }
        />
        <ToolbarButton
          icon={<Frame />}
          active={actualAction === 'frameTool'}
          onClick={() => triggerTool('frameTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a frame</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'F',
                  [SYSTEM_OS.OTHER]: 'F',
                }}
              />
            </div>
          }
        />
        <div className="w-full justify-center items-center flex">
          <div className="w-[20px] h-[1px] bg-zinc-200 my-1"></div>
        </div>
        <ToolbarButton
          icon={<Tags />}
          active={actualAction === 'colorTokenTool'}
          onClick={() => triggerTool('colorTokenTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add color token</p>
              <ShortcutElement
                variant="light"
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'P',
                  [SYSTEM_OS.OTHER]: 'P',
                }}
              />
            </div>
          }
        />
      </Toolbar>
    </motion.div>
  );
}
