import { BlendMode, PDFDocument } from 'pdf-lib';
import { WeaveSelection, WeaveStateElement } from '@inditextech/weave-types';
import React from 'react';
import Konva from 'konva';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollaborationRoom } from '@/store/store';
import { useWeave } from '@inditextech/weave-react';
import {
  AlignStartHorizontal,
  Download,
  Presentation,
  SkipBack,
  SkipForward,
  SquareCheck,
  StepBack,
  StepForward,
  X,
  XIcon,
} from 'lucide-react';
import { toImageAsync } from './utils';
import { FrameImage } from './frames-library.image';
import { FramePresentationImage } from './frames-library.presentation-image';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarSelector } from '../sidebar-selector';

export const FramesLibrary = () => {
  const instance = useWeave((state) => state.instance);
  const appState = useWeave((state) => state.appState);
  const selectedNodes = useWeave((state) => state.selection.nodes);

  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const [presentationMode, setPresentationMode] =
    React.useState<boolean>(false);
  const [actualFrame, setActualFrame] = React.useState<number>(0);
  const [selectedFrames, setSelectedFrames] = React.useState<string[]>([]);

  const framesAvailable = React.useMemo(() => {
    if (!instance) {
      return [];
    }

    const stage = instance.getStage();

    if (!stage) {
      return [];
    }

    const nodes = instance.findNodesByType(
      appState.weave as WeaveStateElement,
      'frame'
    );

    const frames: Konva.Node[] = [];
    for (const node of nodes) {
      const ele = stage.findOne(`#${node.key}`);
      if (ele) {
        frames.push(ele);
      }
    }
    return frames;
  }, [instance, appState]);

  const selectedNodesAllFrame = React.useMemo(() => {
    let allFrame = true;
    for (const node of selectedNodes) {
      if (node.node.type !== 'frame') {
        allFrame = false;
        break;
      }
    }
    return allFrame;
  }, [selectedNodes]);

  const alignItemsHandler = React.useCallback(() => {
    if (!instance) {
      return;
    }

    instance.triggerAction<{ gap: number; nodes: WeaveSelection[] }>(
      'alignElementsTool',
      {
        gap: 20,
        nodes: selectedNodes,
      }
    );
    instance.triggerAction('selectionTool');
  }, [instance, selectedNodes]);

  const exportFramesHandler = React.useCallback(async () => {
    if (!instance) {
      return;
    }

    const stage = instance.getStage();

    let framesToRender = selectedFrames;
    if (framesToRender.length === 0) {
      framesToRender = framesAvailable.map((e) => e.getAttrs().id ?? '');
    }

    const pages: { title: string; image: string }[] = [];
    for (const frameId of selectedFrames) {
      const node = stage.findOne(`#${frameId}`) as Konva.Group | undefined;
      if (node) {
        const attrs = node.getAttrs();
        const frameBg = node.findOne(`#${attrs.id}-bg`) as Konva.Group;
        const boxBg = frameBg.getClientRect();
        const img = await toImageAsync(node, {
          pixelRatio: 2,
          x: boxBg.x + 4,
          y: boxBg.y + 4,
          width: boxBg.width - 8,
          height: boxBg.height - 8,
        });
        pages.push({ title: attrs.title, image: img.src });
      }
    }

    const pdfDoc = await PDFDocument.create();
    for (const page of pages) {
      const pdfPage = pdfDoc.addPage([1403, 992]);
      const imageDoc = await pdfDoc.embedPng(page.image);
      pdfPage.drawImage(imageDoc, {
        x: 30,
        y: 30,
        width: 1403 - 60,
        height: 992 - 60,
        blendMode: BlendMode.Normal,
      });
    }

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = 'test.pdf';
    link.click();
  }, [instance, selectedFrames, framesAvailable]);

  const actualNodePresentation = React.useMemo(() => {
    const frameId = selectedFrames[actualFrame];
    const node = framesAvailable.find((e) => e.getAttrs().id === frameId);
    if (node) {
      return node;
    }
    return undefined;
  }, [actualFrame, selectedFrames, framesAvailable]);

  if (!instance) {
    return null;
  }

  if (sidebarLeftActive !== SIDEBAR_ELEMENTS.frames) {
    return null;
  }

  console.log('AQUI?');

  return (
    <>
      <div className="w-full h-full">
        <div className="w-full px-[24px] py-[27px] bg-white flex justify-between items-center border-b border-[#c9c9c9]">
          <div className="flex justify-between font-inter font-light items-center text-[24px] uppercase">
            <SidebarSelector title="Frames" />
          </div>
          <div className="flex justify-end items-center gap-4">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent w-[20px] h-[40px] hover:text-[#c9c9c9]"
                    disabled={selectedFrames.length === 0}
                    onClick={() => {
                      setActualFrame(0);
                      setPresentationMode((prev) => !prev);
                    }}
                  >
                    <Presentation
                      className="group-disabled:text-[#cccccc]"
                      size={20}
                      strokeWidth={1}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="rounded-none"
                >
                  Presentation mode
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="cursor-pointer bg-transparent w-[20px] h-[40px] hover:text-[#c9c9c9]"
                    disabled={
                      selectedNodes.length <= 1 || !selectedNodesAllFrame
                    }
                    onClick={alignItemsHandler}
                  >
                    <AlignStartHorizontal size={20} strokeWidth={1} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="rounded-none"
                >
                  Align horizontally
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="cursor-pointer bg-transparent w-[20px] h-[40px] hover:text-[#c9c9c9]"
                    onClick={() => {
                      if (selectedFrames.length === 0) {
                        const frames = framesAvailable.map((frame) => {
                          const attrs = frame.getAttrs();
                          return attrs.id ?? '';
                        });
                        setSelectedFrames(frames);
                      } else {
                        setSelectedFrames([]);
                      }
                    }}
                  >
                    <SquareCheck size={20} strokeWidth={1} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="rounded-none"
                >
                  Select all frames
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent w-[20px] h-[40px] hover:text-[#c9c9c9]"
                    disabled={selectedFrames.length === 0}
                    onClick={exportFramesHandler}
                  >
                    <Download
                      className="group-disabled:text-[#cccccc]"
                      size={20}
                      strokeWidth={1}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="rounded-none"
                >
                  Export as PDF
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              className="cursor-pointer bg-transparent w-[20px] h-[40px] hover:text-[#c9c9c9]"
              onClick={() => {
                setSidebarActive(null);
              }}
            >
              <X size={20} strokeWidth={1} />
            </button>
          </div>
        </div>
        <ScrollArea className="w-full h-[calc(100%-95px)]">
          <div className="flex flex-col gap-[24px] w-full h-full p-[24px]">
            {framesAvailable.length === 0 && (
              <div className="col-span-2 w-full mt-[24px] flex flex-col justify-center items-center text-sm text-center font-inter font-light">
                <b className="font-normal text-[18px]">No frames created</b>
                <span className="text-[14px]">
                  Add a frame to the whiteboard
                </span>
              </div>
            )}
            {framesAvailable.map((node) => {
              const attrs = node.getAttrs();

              return (
                <div
                  key={attrs.id}
                  className="w-full bg-light-background-1 flex flex-col gap-3"
                >
                  <div className="w-full flex justify-between items-center">
                    <div className="w-full text-[14px] font-inter font-light">
                      {attrs.title}
                    </div>
                    <div className="font-label-l-regular">
                      <Checkbox
                        className="cursor-pointer rounded-none"
                        checked={
                          selectedFrames.findIndex((e) => e === attrs.id) !== -1
                        }
                        onCheckedChange={() => {
                          setSelectedFrames((prev) => {
                            const newElements = new Set(prev);
                            if (newElements.has(attrs.id ?? '')) {
                              newElements.delete(attrs.id ?? '');
                            } else {
                              newElements.add(attrs.id ?? '');
                            }
                            return Array.from(newElements);
                          });
                        }}
                      />
                    </div>
                  </div>
                  <FrameImage node={node as Konva.Group} />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {presentationMode && (
        <div className="fixed z-10 top-0 left-0 right-0 bottom-0 bg-black flex flex-col gap-3 justify-center items-start">
          <div className="absolute top-8 right-8 flex justify-end items-center p-1">
            <div className="flex justify-end items-center bg-white">
              <button
                className="cursor-pointer bg-transparent hover:bg-accent p-2"
                onClick={() => {
                  setPresentationMode((prev) => !prev);
                }}
              >
                <XIcon size={24} />
              </button>
            </div>
          </div>
          <div className="absolute bottom-8 left-8 right-8 flex justify-center items-center">
            <div className="flex justify-center items-center  p-1">
              <div className="flex justify-end items-center bg-white border border-zinc-200 p-1">
                <button
                  className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
                  disabled={actualFrame === 0}
                  onClick={() => {
                    setActualFrame(0);
                  }}
                >
                  <SkipBack className="group-disabled:text-accent" size={24} />
                </button>
                <button
                  className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
                  disabled={actualFrame === 0}
                  onClick={() => {
                    setActualFrame((prev) => prev - 1);
                  }}
                >
                  <StepBack className="group-disabled:text-accent" size={24} />
                </button>
                <button
                  className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
                  disabled={actualFrame === selectedFrames.length - 1}
                  onClick={() => {
                    setActualFrame((prev) => prev + 1);
                  }}
                >
                  <StepForward
                    className="group-disabled:text-accent"
                    size={24}
                  />
                </button>
                <button
                  className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
                  disabled={actualFrame === selectedFrames.length - 1}
                  onClick={() => {
                    setActualFrame(selectedFrames.length - 1);
                  }}
                >
                  <SkipForward
                    className="group-disabled:text-accent"
                    size={24}
                  />
                </button>
              </div>
            </div>
          </div>
          <div className="w-full h-full bg-black">
            <FramePresentationImage
              key={selectedFrames[actualFrame]}
              node={actualNodePresentation as Konva.Group}
            />
          </div>
        </div>
      )}
    </>
  );
};
