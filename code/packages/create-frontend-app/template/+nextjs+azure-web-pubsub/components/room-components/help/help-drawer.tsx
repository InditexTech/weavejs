import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Keyboard, XIcon } from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpTools } from "./help-tools";
import React from "react";
import { useGetOs } from "../hooks/use-get-os";
import { HelpZoom } from "./help-zoom";
import { HelpView } from "./help-view";
import { HelpSelection } from "./help-selection";
import { HelpEdit } from "./help-edit";
import { HelpArrange } from "./help-arrange";
import { useCollaborationRoom } from "@/store/store";
import { DRAWER_ELEMENTS } from "@/lib/constants";

export const HelpDrawerTrigger = () => {
  const os = useGetOs();

  const keyboardShortcutsVisible = useCollaborationRoom(
    (state) => state.drawer.keyboardShortcuts.visible,
  );
  const setShowDrawer = useCollaborationRoom((state) => state.setShowDrawer);

  return (
    <DropdownMenuItem
      onClick={() => {
        setShowDrawer(
          DRAWER_ELEMENTS.keyboardShortcuts,
          !keyboardShortcutsVisible,
        );
      }}
      className="w-full text-foreground cursor-pointer hover:rounded-none"
    >
      <Keyboard /> Keyboard shortcuts
      <DropdownMenuShortcut>
        {[SYSTEM_OS.MAC as string].includes(os) ? "⌘ K" : "Ctrl K"}
      </DropdownMenuShortcut>
    </DropdownMenuItem>
  );
};

export const HelpDrawer = () => {
  const keyboardShortcutsVisible = useCollaborationRoom(
    (state) => state.drawer.keyboardShortcuts.visible,
  );
  const setShowDrawer = useCollaborationRoom((state) => state.setShowDrawer);

  const handleDrawer = React.useCallback(() => {
    setShowDrawer(DRAWER_ELEMENTS.keyboardShortcuts, !keyboardShortcutsVisible);
  }, [keyboardShortcutsVisible, setShowDrawer]);

  return (
    <Drawer
      modal={false}
      open={keyboardShortcutsVisible}
      onOpenChange={handleDrawer}
    >
      <DrawerContent className="p-0 !rounded-none bg-black flex flex-col justify-start items-center min-h-[330px]">
        <DrawerHeader className="w-[1024px] flex flex-row justify-between items-centers p-0 py-3">
          <DrawerTitle className="flex flex-row justify-start items-center text-center text-white font-inter">
            Keyboard shortcuts
          </DrawerTitle>
          <DrawerClose>
            <div className="outline-none rounded-none font-inter cursor-pointer text-white">
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
