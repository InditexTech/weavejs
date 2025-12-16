// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
import { X } from "lucide-react";
import { useCollaborationRoom } from "@/store/store";
import { Input } from "@/components/ui/input";
import { WeaveExportFormats } from "@inditextech/weave-types";
import { useExportToImageServerSide } from "../hooks/use-export-to-image-server-side";

function safeParseInt(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Math.floor(value); // ya es número, forzamos a entero
  }
  if (typeof value === "string") {
    const n = parseInt(value, 10); // siempre base 10
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

export function ExportConfigDialog() {
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const [format, setFormat] = React.useState<string>("image/png");
  const [padding, setPadding] = React.useState<string>("20");
  const [backgroundColor, setBackgroundColor] =
    React.useState<string>("#FFFFFF");
  const [pixelRatio, setPixelRatio] = React.useState<string>("1");

  const nodesToExport = useCollaborationRoom((state) => state.export.nodes);
  const exportConfigVisible = useCollaborationRoom(
    (state) => state.export.config.visible,
  );
  const setExportConfigVisible = useCollaborationRoom(
    (state) => state.setExportConfigVisible,
  );

  React.useEffect(() => {
    if (exportConfigVisible) {
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 0);
    }
  }, [exportConfigVisible]);

  const { handleExportToImageServerSide, isExporting } =
    useExportToImageServerSide();

  const handleExport = React.useCallback(() => {
    handleExportToImageServerSide({
      nodes: nodesToExport,
      format: format as WeaveExportFormats,
      padding: safeParseInt(padding, 0),
      backgroundColor: backgroundColor,
      pixelRatio: safeParseInt(pixelRatio, 1),
    });
    setExportConfigVisible(false);
  }, [
    nodesToExport,
    format,
    padding,
    backgroundColor,
    pixelRatio,
    handleExportToImageServerSide,
    setExportConfigVisible,
  ]);

  const onKeyDown = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      if (!exportConfigVisible) return;

      if (event.key === "Enter") {
        handleExport();
      }
    },
    [exportConfigVisible, handleExport],
  );

  React.useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <Dialog
      open={exportConfigVisible}
      onOpenChange={(open) => setExportConfigVisible(open)}
      modal={true}
    >
      <form>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="w-full flex gap-5 justify-between items-center">
              <DialogTitle className="font-inter text-2xl font-normal uppercase">
                Export to Image
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="cursor-pointer bg-transparent hover:bg-accent p-[2px]"
                  onClick={() => {
                    setExportConfigVisible(false);
                  }}
                >
                  <X size={16} strokeWidth={1} />
                </button>
              </DialogClose>
            </div>
            <DialogDescription className="font-inter text-sm mt-5">
              Define the properties of the exported image.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-start items-center inter text-xs">
                Format
              </div>
              <div className="flex justify-end items-center">
                <Select
                  value={format}
                  onValueChange={setFormat}
                  disabled={isExporting()}
                >
                  <SelectTrigger className="font-inter text-xs rounded-none !h-[30px] !border-black !shadow-none">
                    <SelectValue placeholder="Amount" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-none p-0 w-[var(--radix-popover-trigger-width)] border-black"
                    align="end"
                  >
                    <SelectGroup>
                      <SelectItem
                        value="image/png"
                        className="font-inter text-xs rounded-none"
                      >
                        PNG
                      </SelectItem>
                      <SelectItem
                        value="image/jpeg"
                        className="font-inter text-xs rounded-none"
                      >
                        JPEG
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-start items-center inter text-xs">
                Padding (px)
              </div>
              <div className="flex justify-end items-center">
                <Input
                  className="w-[100px] font-inter !py-1 !pt-[2px] text-right text-xs rounded-none !h-[30px] !border-black !shadow-none"
                  value={padding}
                  disabled={isExporting()}
                  onFocus={() => {
                    window.weaveOnFieldFocus = true;
                  }}
                  onBlurCapture={() => {
                    window.weaveOnFieldFocus = false;
                  }}
                  onChange={(e) => setPadding(e.target.value)}
                  placeholder="Example: 20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-start items-center inter text-xs">
                Background color
              </div>
              <div className="flex justify-end items-center">
                <Select
                  value={backgroundColor}
                  onValueChange={setBackgroundColor}
                  disabled={isExporting()}
                >
                  <SelectTrigger className="font-inter text-xs rounded-none !h-[30px] !border-black !shadow-none">
                    <SelectValue placeholder="Amount" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-none p-0 w-[var(--radix-popover-trigger-width)] border-black"
                    align="end"
                  >
                    <SelectGroup>
                      <SelectItem
                        value="#FFFFFF"
                        className="font-inter text-xs rounded-none"
                      >
                        White
                      </SelectItem>
                      <SelectItem
                        value="#D3D3D3"
                        className="font-inter text-xs rounded-none"
                      >
                        Gray
                      </SelectItem>
                      <SelectItem
                        value="#000000"
                        className="font-inter text-xs rounded-none"
                      >
                        Black
                      </SelectItem>
                      <SelectItem
                        value="transparent"
                        className="font-inter text-xs rounded-none"
                      >
                        None
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-start items-center inter text-xs">
                Pixel ratio
              </div>
              <div className="flex justify-end items-center">
                <Select
                  value={pixelRatio}
                  onValueChange={setPixelRatio}
                  disabled={isExporting()}
                >
                  <SelectTrigger className="font-inter text-xs rounded-none !h-[30px] !border-black !shadow-none">
                    <SelectValue placeholder="Amount" />
                  </SelectTrigger>
                  <SelectContent
                    className="rounded-none p-0 w-[var(--radix-popover-trigger-width)] border-black"
                    align="end"
                  >
                    <SelectGroup>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (ratio) => (
                          <SelectItem
                            key={ratio}
                            value={`${ratio}`}
                            className="font-inter text-xs rounded-none"
                          >
                            {`${ratio}`}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              ref={buttonRef}
              type="button"
              className="cursor-pointer font-inter rounded-none"
              onClick={handleExport}
            >
              EXPORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
