// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Keyboard, XIcon } from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpTools } from "./help-tools";
import { ShortcutElement } from "./shortcut-element";
import React from "react";
import { useKeyDown } from "../hooks/use-key-down";
import { useGetOs } from "../hooks/use-get-os";
import { HelpZoom } from "./help-zoom";
import { HelpView } from "./help-view";
import { HelpSelection } from "./help-selection";
import { HelpEdit } from "./help-edit";
import { HelpArrange } from "./help-arrange";

export const HelpDrawer = () => {
  const os = useGetOs();

  const [open, setOpen] = React.useState<boolean>(false);

  useKeyDown(
    () => {
      setOpen((prev) => !prev);
    },
    ["KeyK"],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  return (
    <Drawer modal={false} open={open} onOpenChange={setOpen}>
      <DrawerTrigger>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger
              asChild
              className="pointer-events-auto cursor-pointer hover:text-black hover:bg-accent w-8 h-8 px-2 py-2"
            >
              <Keyboard />
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="rounded-none">
              <div className="flex flex-col gap-2 justify-start items-end">
                <p>Keyboard shortcuts</p>
                <ShortcutElement
                  variant="light"
                  shortcuts={{
                    [SYSTEM_OS.MAC]: "⌘ K",
                    [SYSTEM_OS.OTHER]: "Ctrl K",
                  }}
                />
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DrawerTrigger>
      <DrawerContent className="p-0 !rounded-none bg-black flex flex-col justify-start items-center min-h-[330px]">
        <DrawerHeader className="w-[1024px] flex flex-row justify-between items-centers p-0 py-3">
          <DrawerTitle className="flex flex-row justify-start items-center text-center text-white font-questrial">
            Keyboard shortcuts
          </DrawerTitle>
          <DrawerClose>
            <div className="outline-none rounded-none font-questrial cursor-pointer text-white">
              <XIcon size={24} />
            </div>
          </DrawerClose>
        </DrawerHeader>
        <Tabs defaultValue="tools" className="w-[1024px] my-5 p-0">
          <TabsList className="w-full bg-zinc-700 rounded-none  h-auto">
            <TabsTrigger
              value="tools"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              Tools
            </TabsTrigger>
            <TabsTrigger
              value="view"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              View
            </TabsTrigger>
            <TabsTrigger
              value="zoom"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              Zoom
            </TabsTrigger>
            <TabsTrigger
              value="selection"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              Selection
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              Edit
            </TabsTrigger>
            <TabsTrigger
              value="arrange"
              className="cursor-pointer bg-black rounded-none p-1"
            >
              Arrange
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tools">
            <HelpTools />
          </TabsContent>
          <TabsContent value="view">
            <HelpView />
          </TabsContent>
          <TabsContent value="zoom">
            <HelpZoom />
          </TabsContent>
          <TabsContent value="selection">
            <HelpSelection />
          </TabsContent>
          <TabsContent value="edit">
            <HelpEdit />
          </TabsContent>
          <TabsContent value="arrange">
            <HelpArrange />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};
