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
  Undo,
  Redo,
} from 'lucide-react';
import { useWeave } from '@inditextech/weave-react';
import { Toolbar } from '../toolbar/toolbar';
import { motion } from 'framer-motion';
import { topElementVariants } from './variants';
import { useCollaborationRoom } from '@/store/store';
import { ShortcutElement } from '../help/shortcut-element';
import { SYSTEM_OS } from '@/lib/utils';
import { useKeyboardHandler } from '../hooks/use-keyboard-handler';

function ToolbarDivider() {
  return (
    <div className="w-full justify-center items-center flex">
      <div className="w-[1px] h-[20px] bg-zinc-200 mx-1"></div>
    </div>
  );
}

export function ToolsOverlay() {
  useKeyboardHandler();

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

  const mutationUpload = useMutation({
    mutationFn: async (file: File) => {
      return await postImage(room ?? '', file);
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
            `${process.env.NEXT_PUBLIC_API_ENDPOINT}/weavejs/rooms/${room}/images/${imageId}`
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
      variants={topElementVariants}
      className="pointer-events-none absolute left-[24px] right-[24px] bottom-[24px] flex flex-col gap-2 justify-center items-center"
    >
      <Toolbar orientation="horizontal">
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Hand className="px-2" size={40} strokeWidth={1} />}
          active={actualAction === 'moveTool'}
          onClick={() => triggerTool('moveTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Move</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'M',
                  [SYSTEM_OS.OTHER]: 'M',
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
          active={actualAction === 'selectionTool'}
          onClick={() => triggerTool('selectionTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Selection</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'S',
                  [SYSTEM_OS.OTHER]: 'S',
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<Square className="px-2" size={40} strokeWidth={1} />}
          active={actualAction === 'rectangleTool'}
          onClick={() => triggerTool('rectangleTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a rectangle</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'R',
                  [SYSTEM_OS.OTHER]: 'R',
                }}
              />
            </div>
          }
          tooltipSide="top"
          tooltipAlign="center"
        />
        <ToolbarButton
          className="rounded-full !w-[40px]"
          icon={<PenTool className="px-2" size={40} strokeWidth={1} />}
          active={actualAction === 'penTool'}
          onClick={() => triggerTool('penTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a line</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'L',
                  [SYSTEM_OS.OTHER]: 'L',
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
          active={actualAction === 'brushTool'}
          onClick={() => triggerTool('brushTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Free draw</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'B',
                  [SYSTEM_OS.OTHER]: 'B',
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
          active={actualAction === 'textTool'}
          onClick={() => triggerTool('textTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add text</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'T',
                  [SYSTEM_OS.OTHER]: 't',
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
          active={actualAction === 'imageTool'}
          onClick={() => {
            triggerTool('imageTool');
            setShowSelectFileImage(true);
          }}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add an image</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'I',
                  [SYSTEM_OS.OTHER]: 'I',
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
          active={actualAction === 'frameTool'}
          onClick={() => triggerTool('frameTool', nodeCreateProps)}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a frame</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'F',
                  [SYSTEM_OS.OTHER]: 'F',
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
          active={actualAction === 'colorTokenTool'}
          onClick={() => triggerTool('colorTokenTool')}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add color token reference</p>
              <ShortcutElement
                shortcuts={{
                  [SYSTEM_OS.MAC]: 'P',
                  [SYSTEM_OS.OTHER]: 'P',
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
                shortcuts={{
                  [SYSTEM_OS.MAC]: '⇧ ⌘ ,',
                  [SYSTEM_OS.OTHER]: '⇧ Ctrl ,',
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
                shortcuts={{
                  [SYSTEM_OS.MAC]: '⇧ ⌘ .',
                  [SYSTEM_OS.OTHER]: '⇧ Ctrl .',
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
