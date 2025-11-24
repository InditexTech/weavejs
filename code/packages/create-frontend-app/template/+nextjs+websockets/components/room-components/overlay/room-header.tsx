"use client";

import React from "react";
import { cn, SYSTEM_OS } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/utils/logo";
import {
  Image as ImageIcon,
  LogOut,
  ChevronDown,
  ChevronUp,
  Grid3X3Icon,
  GripIcon,
  Braces,
  Github,
  Book,
  MousePointer2,
  Check,
  Grid2X2Check,
  Grid2X2X,
} from "lucide-react";
import {
  WEAVE_GRID_TYPES,
  WeaveStageGridPlugin,
  WeaveStageGridType,
  WeaveUsersPointersPlugin,
} from "@inditextech/weave-sdk";
import { ConnectionStatus } from "../connection-status";
import { topElementVariants } from "./variants";
import { ConnectedUsers } from "../connected-users";
import { Divider } from "./divider";
import { ZoomToolbar } from "./zoom-toolbar";
import { HelpDrawerTrigger } from "../help/help-drawer";
import { DOCUMENTATION_URL, GITHUB_URL } from "@/lib/constants";
import weavePackage from "../../../node_modules/@inditextech/weave-sdk/package.json";
import weaveReactHelperPackage from "../../../node_modules/@inditextech/weave-react/package.json";
import weaveStorePackage from "../../../node_modules/@inditextech/weave-store-websockets/package.json";
import { WEAVE_STORE_CONNECTION_STATUS } from "@inditextech/weave-types";

export function RoomHeader() {
  const router = useRouter();

  const instance = useWeave((state) => state.instance);
  const selectionActive = useWeave((state) => state.selection.active);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);

  const showUI = useCollaborationRoom((state) => state.ui.show);
  const room = useCollaborationRoom((state) => state.room);
  const setExportNodes = useCollaborationRoom((state) => state.setExportNodes);
  const setExportConfigVisible = useCollaborationRoom(
    (state) => state.setExportConfigVisible,
  );

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pointersEnabled, setPointersEnabled] = React.useState(true);
  const [gridEnabled, setGridEnabled] = React.useState(true);
  const [gridType, setGridType] = React.useState<WeaveStageGridType>(
    WEAVE_GRID_TYPES.LINES,
  );

  const handleToggleUsersPointers = React.useCallback(() => {
    if (!instance) return;

    const userPointersPlugin =
      instance.getPlugin<WeaveUsersPointersPlugin>("usersPointers");

    if (userPointersPlugin && userPointersPlugin.isEnabled()) {
      userPointersPlugin.disable();
      setPointersEnabled(false);
      return;
    }
    if (userPointersPlugin && !userPointersPlugin.isEnabled()) {
      userPointersPlugin.enable();
      setPointersEnabled(true);
      return;
    }
  }, [instance]);

  const handleToggleGrid = React.useCallback(() => {
    if (instance && instance.isPluginEnabled("stageGrid")) {
      instance.disablePlugin("stageGrid");
      setGridEnabled(instance.isPluginEnabled("stageGrid"));
      return;
    }
    if (instance && !instance.isPluginEnabled("stageGrid")) {
      instance.enablePlugin("stageGrid");
      setGridEnabled(instance.isPluginEnabled("stageGrid"));
      return;
    }
  }, [instance]);

  const handleSetGridType = React.useCallback(
    (type: WeaveStageGridType) => {
      if (instance) {
        (instance.getPlugin("stageGrid") as WeaveStageGridPlugin)?.setType(
          type,
        );
        setGridType(type);
      }
    },
    [instance],
  );

  const handleExportToImage = React.useCallback(() => {
    if (!instance) return;

    setExportNodes([]);
    setExportConfigVisible(true);
  }, [instance, setExportNodes, setExportConfigVisible]);

  React.useEffect(() => {
    if (instance) {
      setGridEnabled(instance.isPluginEnabled("stageGrid"));
    }
  }, [instance]);

  React.useEffect(() => {
    if (instance) {
      const stageGridPlugin = instance.getPlugin(
        "stageGrid",
      ) as WeaveStageGridPlugin;
      setGridType(stageGridPlugin?.getType());
    }
  }, [instance]);

  const handleExitRoom = React.useCallback(() => {
    sessionStorage.removeItem(`weave.js_${room}`);
    instance?.getStore().disconnect();
    router.push("/");
  }, [instance, room, router]);

  const handlePrintToConsoleState = React.useCallback(() => {
    if (instance) {
      // eslint-disable-next-line no-console
      console.log({
        appState: JSON.parse(JSON.stringify(instance.getStore().getState())),
      });
    }
  }, [instance]);

  if (!showUI) {
    return null;
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={topElementVariants}
        className={cn(
          "w-auto z-1 flex gap-1 justify-center items-center absolute top-[16px] left-[16px]",
          {
            ["pointer-events-none"]: selectionActive,
            ["pointer-events-auto"]: !selectionActive,
          },
        )}
      >
        <div className="bg-white flex justify-between items-center gap-0 py-[5px] px-[32px] border-[0.5px] border-[#c9c9c9]">
          <div className="flex justify-start items-center gap-3">
            <DropdownMenu
              onOpenChange={(open: boolean) => {
                setMenuOpen(open);
              }}
            >
              <DropdownMenuTrigger
                className={cn(
                  "rounded-none cursor-pointer focus:outline-none",
                  {
                    ["font-normal"]: menuOpen,
                    ["font-extralight"]: !menuOpen,
                  },
                )}
              >
                <div className="flex gap-1 justify-start items-center">
                  <div className="h-[60px] flex justify-start items-center">
                    <Logo kind="only-logo" variant="no-text" />
                  </div>
                  {menuOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
                align="start"
                side="bottom"
                alignOffset={0}
                sideOffset={9}
                className="font-inter rounded-none"
              >
                <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                  Debug
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-foreground cursor-pointer hover:rounded-none w-full"
                    onClick={handlePrintToConsoleState}
                  >
                    <Braces /> Print state to console
                    <DropdownMenuShortcut>
                      {SYSTEM_OS.MAC ? "⌥ ⌘ C" : "Alt Ctrl C"}
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                  Interface
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <HelpDrawerTrigger />
                  <DropdownMenuItem
                    className="text-foreground cursor-pointer hover:rounded-none"
                    disabled={
                      weaveConnectionStatus !==
                      WEAVE_STORE_CONNECTION_STATUS.CONNECTED
                    }
                    onClick={handleToggleUsersPointers}
                  >
                    <div className="w-full flex justify-between items-center gap-2">
                      <div className="w-full flex justify-start items-center gap-2">
                        <MousePointer2 size={16} />
                        Show users pointers
                      </div>
                      {pointersEnabled && (
                        <Check size={16} className="text-foreground" />
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-foreground cursor-pointer hover:rounded-none"
                    disabled={
                      weaveConnectionStatus !==
                      WEAVE_STORE_CONNECTION_STATUS.CONNECTED
                    }
                    onClick={handleToggleGrid}
                  >
                    <div className="w-full flex justify-between items-center gap-2">
                      <div className="w-full flex justify-start items-center gap-2">
                        {gridEnabled ? (
                          <>
                            <Grid2X2X size={16} />
                            Hide grid
                          </>
                        ) : (
                          <>
                            <Grid2X2Check size={16} />
                            Show grid
                          </>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !gridEnabled ||
                      (gridEnabled && gridType === WEAVE_GRID_TYPES.DOTS) ||
                      weaveConnectionStatus !==
                        WEAVE_STORE_CONNECTION_STATUS.CONNECTED
                    }
                    className="text-foreground cursor-pointer hover:rounded-none"
                    onClick={() => {
                      handleSetGridType(WEAVE_GRID_TYPES.DOTS);
                    }}
                  >
                    <div className="w-full flex justify-between items-center">
                      <div className="w-full flex justify-start items-center gap-2">
                        <GripIcon size={16} /> Grid as dots
                      </div>
                      {gridType === WEAVE_GRID_TYPES.DOTS && (
                        <Check size={16} />
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !gridEnabled ||
                      (gridEnabled && gridType === WEAVE_GRID_TYPES.LINES) ||
                      weaveConnectionStatus !==
                        WEAVE_STORE_CONNECTION_STATUS.CONNECTED
                    }
                    className="text-foreground cursor-pointer hover:rounded-none"
                    onClick={() => {
                      handleSetGridType(WEAVE_GRID_TYPES.LINES);
                    }}
                  >
                    <div className="w-full flex justify-between items-center">
                      <div className="w-full flex justify-start items-center gap-2">
                        <Grid3X3Icon size={16} /> Grid as lines
                      </div>
                      {gridType === WEAVE_GRID_TYPES.LINES && (
                        <Check size={16} />
                      )}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                  Exporting
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  disabled={
                    weaveConnectionStatus !==
                    WEAVE_STORE_CONNECTION_STATUS.CONNECTED
                  }
                  onClick={handleExportToImage}
                >
                  <ImageIcon /> Export room as image
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  onClick={() => {
                    window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Github /> Code repository
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  onClick={() => {
                    window.open(
                      DOCUMENTATION_URL,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <Book /> Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                  Weave.js dependencies versions
                </DropdownMenuLabel>
                <DropdownMenuItem className="text-foreground cursor-pointer hover:rounded-none">
                  <div className="w-full flex gap-1 justify-between items-center">
                    <code>@inditextech/weave-sdk</code>
                    <code className="bg-[#e9e9e9] px-2 py-1 ml-8">
                      v{weavePackage.version}
                    </code>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground cursor-pointer hover:rounded-none">
                  <div className="w-full flex gap-1 justify-between items-center">
                    <code>@inditextech/weave-react</code>
                    <code className="bg-[#e9e9e9] px-2 py-1 ml-8">
                      v{weaveReactHelperPackage.version}
                    </code>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground cursor-pointer hover:rounded-none">
                  <div className="w-full flex gap-1 justify-between items-center">
                    <code>@inditextech/weave-store-azure-web-pubsub</code>
                    <code className="bg-[#e9e9e9] px-2 py-1 ml-8">
                      v{weaveStorePackage.version}
                    </code>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  onClick={handleExitRoom}
                >
                  <LogOut /> Exit room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Divider />
            <div className="flex justify-start items-center gap-1">
              <div className="flex justify-start items-center gap-2 font-inter text-foreground !normal-case min-h-[32px]">
                <div className="font-inter text-[24px] font-light">{room}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={topElementVariants}
        className={cn(
          "w-auto z-1 flex gap-1 justify-center items-center absolute top-[16px] right-[16px]",
          {
            ["pointer-events-none"]: selectionActive,
            ["pointer-events-auto"]: !selectionActive,
          },
        )}
      >
        <div className="w-auto h-[72px] bg-white flex justify-between items-center gap-0 py-[5px] px-[32px] border-[0.5px] border-[#c9c9c9]">
          <div className="flex justify-end items-center gap-[24px]">
            <div className="flex justify-end items-center gap-[16px]">
              <ConnectionStatus weaveConnectionStatus={weaveConnectionStatus} />
              <div className="max-w-[320px]">
                <ConnectedUsers />
              </div>
            </div>
            <Divider />
            <ZoomToolbar />
          </div>
        </div>
      </motion.div>
    </>
  );
}
