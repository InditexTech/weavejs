import { PDFDocument } from "pdf-lib";
import { WeaveSelection, WeaveStateElement } from "@inditextech/weavejs-types";
import React from "react";
import Konva from "konva";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollaborationRoom } from "@/store/store";
import { useWeave } from "@inditextech/weavejs-react";
import {
  AlignStartHorizontal,
  Download,
  Presentation,
  SkipBack,
  SkipForward,
  SquareCheck,
  StepBack,
  StepForward,
  XIcon,
} from "lucide-react";
import { toImageAsync } from "./utils";
import { FrameImage } from "./frames-library.image";
import { FramePresentationImage } from "./frames-library.presentation-image";

export const FramesLibrary = () => {
  const instance = useWeave((state) => state.instance);
  const appState = useWeave((state) => state.appState);
  const selectedNodes = useWeave((state) => state.selection.nodes);

  const [presentationMode, setPresentationMode] =
    React.useState<boolean>(false);
  const [actualFrame, setActualFrame] = React.useState<number>(0);
  const [selectedFrames, setSelectedFrames] = React.useState<string[]>([]);

  const framesLibraryVisible = useCollaborationRoom(
    (state) => state.frames.library.visible
  );

  const framesAvailable = React.useMemo(() => {
    if (!instance) {
      return [];
    }

    const stage = instance.getStage();
    const nodes = instance.findNodesByType(
      appState.weave as WeaveStateElement,
      "frame"
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
      if (node.node.type !== "frame") {
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
      "alignElementsTool",
      {
        gap: 20,
        nodes: selectedNodes,
      }
    );
  }, [instance, selectedNodes]);

  const exportFramesHandler = React.useCallback(async () => {
    if (!instance) {
      return;
    }

    const stage = instance.getStage();

    let framesToRender = selectedFrames;
    if (framesToRender.length === 0) {
      framesToRender = framesAvailable.map((e) => e.getAttrs().id ?? "");
    }

    const pages: { title: string; image: string }[] = [];
    for (const frameId of selectedFrames) {
      const node = stage.findOne(`#${frameId}`) as Konva.Group | undefined;
      if (node) {
        const attrs = node.getAttrs();
        const frameBg = node.findOne(`#${attrs.id}-bg`) as Konva.Group;
        const boxBg = frameBg.getClientRect();
        const img = await toImageAsync(node, {
          x: boxBg.x + 2,
          y: boxBg.y + 2,
          width: boxBg.width - 4,
          height: boxBg.height - 4,
        });
        pages.push({ title: attrs.title, image: img.src });
      }
    }

    const pdfDoc = await PDFDocument.create();
    for (const page of pages) {
      const pdfPage = pdfDoc.addPage([1403, 992]);
      const imageDoc = await pdfDoc.embedJpg(page.image);
      pdfPage.drawImage(imageDoc, {
        x: 30,
        y: 30,
        width: 1403 - 60,
        height: 992 - 60,
      });
    }

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    const link = document.createElement("a");
    link.href = pdfDataUri;
    link.download = "test.pdf";
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

  if (!framesLibraryVisible) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-auto w-full h-full">
        <div className="w-[calc(100%-38px)] font-title-xs p-1 pr-0 bg-white flex justify-between items-center">
          <div className="flex justify-between font-noto-sans-mono font-light items-center text-md pl-2">
            Frames
          </div>
          <div className="flex justify-end items-center gap-1">
            <button
              className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
              disabled={selectedFrames.length === 0}
              onClick={() => {
                setActualFrame(0);
                setPresentationMode((prev) => !prev);
              }}
            >
              <Presentation className="group-disabled:text-accent" size={16} />
            </button>
            <button
              className="cursor-pointer bg-transparent hover:bg-accent p-2"
              disabled={selectedNodes.length <= 1 || !selectedNodesAllFrame}
              onClick={alignItemsHandler}
            >
              <AlignStartHorizontal size={16} />
            </button>
            <button
              className="cursor-pointer bg-transparent hover:bg-accent p-2"
              onClick={() => {
                if (selectedFrames.length === 0) {
                  const frames = framesAvailable.map((frame) => {
                    const attrs = frame.getAttrs();
                    return attrs.id ?? "";
                  });
                  setSelectedFrames(frames);
                } else {
                  setSelectedFrames([]);
                }
              }}
            >
              <SquareCheck size={16} />
            </button>
            <button
              className="group cursor-pointer bg-transparent disabled:cursor-default hover:disabled:bg-transparent hover:bg-accent p-2"
              disabled={selectedFrames.length === 0}
              onClick={exportFramesHandler}
            >
              <Download className="group-disabled:text-accent" size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full h-[calc(100%-50px)] border-t border-zinc-200 p-3">
          {framesAvailable.length === 0 && (
            <div className="col-span-2 w-full flex flex-col justify-center items-center text-sm py-5 text-center">
              <b>No frames created</b>
              <span className="text-xs">Add a frame to the whiteboard</span>
            </div>
          )}
          {framesAvailable.map((node) => {
            const attrs = node.getAttrs();

            return (
              <div
                key={attrs.id}
                className="w-full bg-light-background-1 flex flex-col gap-2"
              >
                <div className="w-full flex justify-between items-center">
                  <div className="w-full text-xs font-noto-sans-mono font-light">
                    {attrs.title}
                  </div>
                  <div className="font-label-l-regular">
                    <Checkbox
                      className="cursor-pointer"
                      checked={
                        selectedFrames.findIndex((e) => e === attrs.id) !== -1
                      }
                      onCheckedChange={() => {
                        setSelectedFrames((prev) => {
                          const newElements = new Set(prev);
                          if (newElements.has(attrs.id ?? "")) {
                            newElements.delete(attrs.id ?? "");
                          } else {
                            newElements.add(attrs.id ?? "");
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
      </div>
      {presentationMode && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black flex flex-col gap-3 justify-center items-start">
          <div className="absolute top-8 right-8 flex justify-end items-center p-1">
            <div className="flex justify-end items-center shadow-lg bg-white">
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
              <div className="flex justify-end items-center shadow-lg bg-white border border-zinc-200 p-1">
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
