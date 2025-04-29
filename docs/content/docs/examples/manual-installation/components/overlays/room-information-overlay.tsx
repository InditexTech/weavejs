"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Image as ImageIcon,
  LogOut,
  ChevronDown,
  ChevronUp,
  Grid2X2PlusIcon,
  Grid2x2XIcon,
  Grid3X3Icon,
  GripIcon,
  CheckIcon,
} from "lucide-react";
import {
  WEAVE_GRID_TYPES,
  WeaveExportStageActionParams,
  WeaveStageGridPlugin,
  WeaveStageGridType,
} from "@inditextech/weave-sdk";
import { ConnectionStatus } from "./connection-status";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";

export function RoomInformationOverlay() {
  const router = useRouter();

  const instance = useWeave((state) => state.instance);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);

  const showUI = useCollaborationRoom((state) => state.ui.show);
  const room = useCollaborationRoom((state) => state.room);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [gridEnabled, setGridEnabled] = React.useState(true);
  const [gridType, setGridType] = React.useState<WeaveStageGridType>(
    WEAVE_GRID_TYPES.LINES
  );

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
          type
        );
        setGridType(type);
      }
    },
    [instance]
  );

  const handleExportToImage = React.useCallback(() => {
    if (instance) {
      instance.triggerAction<WeaveExportStageActionParams>("exportStageTool", {
        options: {
          padding: 20,
          pixelRatio: 2,
        },
      });
    }
  }, [instance]);

  React.useEffect(() => {
    if (instance) {
      setGridEnabled(instance.isPluginEnabled("stageGrid"));
    }
  }, [instance]);

  React.useEffect(() => {
    if (instance) {
      const stageGridPlugin = instance.getPlugin(
        "stageGrid"
      ) as WeaveStageGridPlugin;
      setGridType(stageGridPlugin?.getType());
    }
  }, [instance]);

  // const handleExportToPdf = React.useCallback(() => {
  //   if (instance) {
  //     instance.triggerAction<WeaveExportStageActionParams>("exportStageTool", {
  //       options: {
  //         padding: 20,
  //         pixelRatio: 2,
  //       },
  //     });
  //   }
  // }, [instance]);

  const handleExitRoom = React.useCallback(() => {
    router.push("/");
  }, [router]);

  if (!showUI) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-2 left-2 flex gap-1 justify-center items-center">
      <div className="bg-white border border-zinc-200 shadow-lg flex justify-start items-center gap-0 pr-1">
        <div className="flex justify-start items-center p-1 gap-1">
          <DropdownMenu onOpenChange={(open: boolean) => setMenuOpen(open)}>
            <DropdownMenuTrigger
              className={cn(
                "pointer-events-auto rounded-none cursor-pointer p-1 px-3 hover:bg-accent focus:outline-none",
                {
                  ["bg-accent"]: menuOpen,
                  ["bg-white"]: !menuOpen,
                }
              )}
            >
              <div className="flex justify-start items-center gap-2 font-noto-sans-mono text-foreground !normal-case min-h-[32px]">
                <div className="font-noto-sans text-lg font-extralight">
                  {room}
                </div>
                {menuOpen ? <ChevronUp /> : <ChevronDown />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              alignOffset={0}
              sideOffset={4}
              className="font-noto-sans-mono rounded-none"
            >
              <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                Grid Visibility
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={handleToggleGrid}
              >
                {!gridEnabled && (
                  <>
                    <Grid2X2PlusIcon /> Enable
                  </>
                )}
                {gridEnabled && (
                  <>
                    <Grid2x2XIcon /> Disable
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                Grid Kind
              </DropdownMenuLabel>
              <DropdownMenuItem
                disabled={
                  !gridEnabled ||
                  (gridEnabled && gridType === WEAVE_GRID_TYPES.DOTS)
                }
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={() => {
                  handleSetGridType(WEAVE_GRID_TYPES.DOTS);
                }}
              >
                <div className="w-full flex justify-between items-center">
                  <div className="w-full flex justify-start items-center gap-2">
                    <GripIcon size={16} /> Dots
                  </div>
                  {gridType === WEAVE_GRID_TYPES.DOTS && <CheckIcon />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  !gridEnabled ||
                  (gridEnabled && gridType === WEAVE_GRID_TYPES.LINES)
                }
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={() => {
                  handleSetGridType(WEAVE_GRID_TYPES.LINES);
                }}
              >
                <div className="w-full flex justify-between items-center">
                  <div className="w-full flex justify-start items-center gap-2">
                    <Grid3X3Icon size={16} /> Lines
                  </div>
                  {gridType === WEAVE_GRID_TYPES.LINES && <CheckIcon />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                Exporting
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={handleExportToImage}
              >
                <ImageIcon /> Stage to image
              </DropdownMenuItem>
              {/* <DropdownMenuItem
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={handleExportToPdf}
              >
                <FileText />
                Export to PDF
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={handleExitRoom}
              >
                <LogOut /> Exit room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ConnectionStatus weaveConnectionStatus={weaveConnectionStatus} />
        </div>
      </div>
    </div>
  );
}
