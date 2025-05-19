// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

'use client';

import React from 'react';
import { cn, SYSTEM_OS } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWeave } from '@inditextech/weave-react';
import { SidebarActive, useCollaborationRoom } from '@/store/store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/utils/logo';
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
  SwatchBook,
  ListTree,
  Projector,
  Images,
  PencilRuler,
} from 'lucide-react';
import {
  WEAVE_GRID_TYPES,
  WeaveExportStageActionParams,
  WeaveStageGridPlugin,
  WeaveStageGridType,
  WeaveUsersPointersPlugin,
} from '@inditextech/weave-sdk';
import { ConnectionStatus } from '../connection-status';
import { topElementVariants } from './variants';
import { ConnectedUsers } from '../connected-users';
import { Divider } from './divider';
import { ZoomToolbar } from './zoom-toolbar';
import { HelpDrawerTrigger } from '../help/help-drawer';
import {
  DOCUMENTATION_URL,
  GITHUB_URL,
  SIDEBAR_ELEMENTS,
} from '@/lib/constants';

export function RoomHeader() {
  const router = useRouter();

  const instance = useWeave((state) => state.instance);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);
  const selectionActive = useWeave((state) => state.selection.active);

  const showUI = useCollaborationRoom((state) => state.ui.show);
  const room = useCollaborationRoom((state) => state.room);
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [sidebarsMenuOpen, setSidebarsMenuOpen] = React.useState(false);
  const [pointersEnabled, setPointersEnabled] = React.useState(true);
  const [gridEnabled, setGridEnabled] = React.useState(true);
  const [gridType, setGridType] = React.useState<WeaveStageGridType>(
    WEAVE_GRID_TYPES.LINES
  );

  const sidebarToggle = React.useCallback(
    (element: SidebarActive) => {
      setSidebarActive(element);
    },
    [setSidebarActive]
  );

  const handleToggleUsersPointers = React.useCallback(() => {
    if (!instance) return;

    const userPointersPlugin =
      instance.getPlugin<WeaveUsersPointersPlugin>('usersPointers');

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
    if (instance && instance.isPluginEnabled('stageGrid')) {
      instance.disablePlugin('stageGrid');
      setGridEnabled(instance.isPluginEnabled('stageGrid'));
      return;
    }
    if (instance && !instance.isPluginEnabled('stageGrid')) {
      instance.enablePlugin('stageGrid');
      setGridEnabled(instance.isPluginEnabled('stageGrid'));
      return;
    }
  }, [instance]);

  const handleSetGridType = React.useCallback(
    (type: WeaveStageGridType) => {
      if (instance) {
        (instance.getPlugin('stageGrid') as WeaveStageGridPlugin)?.setType(
          type
        );
        setGridType(type);
      }
    },
    [instance]
  );

  const handleExportToImage = React.useCallback(() => {
    if (instance) {
      instance.triggerAction<WeaveExportStageActionParams>('exportStageTool', {
        options: {
          padding: 20,
          pixelRatio: 2,
        },
      });
    }
  }, [instance]);

  React.useEffect(() => {
    if (instance) {
      setGridEnabled(instance.isPluginEnabled('stageGrid'));
    }
  }, [instance]);

  React.useEffect(() => {
    if (instance) {
      const stageGridPlugin = instance.getPlugin(
        'stageGrid'
      ) as WeaveStageGridPlugin;
      setGridType(stageGridPlugin?.getType());
    }
  }, [instance]);

  const handleExitRoom = React.useCallback(() => {
    sessionStorage.removeItem(`weave.js_${room}`);
    instance?.getStore().disconnect();
    router.push('/');
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
          'w-auto z-1 flex gap-1 justify-center items-center absolute top-[16px] left-[16px]',
          {
            ['pointer-events-none']: selectionActive,
            ['pointer-events-auto']: !selectionActive,
          }
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
                  'rounded-none cursor-pointer focus:outline-none',
                  {
                    ['font-normal']: menuOpen,
                    ['font-extralight']: !menuOpen,
                  }
                )}
              >
                <div className="flex gap-1 justify-start items-center">
                  <div className="h-[60px] flex justify-start items-center">
                    <Logo kind="small" variant="no-text" />
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
                      {SYSTEM_OS.MAC ? '⌥ ⌘ C' : 'Alt Ctrl C'}
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
                      (gridEnabled && gridType === WEAVE_GRID_TYPES.DOTS)
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
                      (gridEnabled && gridType === WEAVE_GRID_TYPES.LINES)
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
                  onClick={handleExportToImage}
                >
                  <ImageIcon /> Stage to image
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  onClick={() => {
                    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Github /> Code repository
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-foreground cursor-pointer hover:rounded-none"
                  onClick={() => {
                    window.open(
                      DOCUMENTATION_URL,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                >
                  <Book /> Documentation
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
          'w-auto z-1 flex gap-1 justify-center items-center absolute top-[16px] right-[16px]',
          {
            ['pointer-events-none']: selectionActive,
            ['pointer-events-auto']: !selectionActive,
          }
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
            <div className="relative flex items-center">
              <DropdownMenu
                onOpenChange={(open: boolean) => {
                  setSidebarsMenuOpen(open);
                }}
              >
                <DropdownMenuTrigger
                  className={cn(
                    'rounded-none cursor-pointer h-[40px] hover:text-[#666666] focus:outline-none',
                    {
                      ['font-normal']: sidebarsMenuOpen,
                      ['font-extralight']: !sidebarsMenuOpen,
                    }
                  )}
                >
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PencilRuler size={20} strokeWidth={1} />
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="end"
                        sideOffset={8}
                        className="rounded-none"
                      >
                        Toolbars
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                  align="end"
                  side="bottom"
                  alignOffset={0}
                  sideOffset={19}
                  className="font-inter rounded-none"
                >
                  <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                    Available Toolbars
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="text-foreground cursor-pointer hover:rounded-none w-full"
                      onClick={() => {
                        sidebarToggle(SIDEBAR_ELEMENTS.images);
                      }}
                    >
                      <Images /> Images
                      <DropdownMenuShortcut>
                        {SYSTEM_OS.MAC ? '⌥ ⌘ I' : 'Alt Ctrl I'}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground cursor-pointer hover:rounded-none w-full"
                      onClick={() => {
                        sidebarToggle(SIDEBAR_ELEMENTS.frames);
                      }}
                    >
                      <Projector /> Frames
                      <DropdownMenuShortcut>
                        {SYSTEM_OS.MAC ? '⌥ ⌘ F' : 'Alt Ctrl F'}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground cursor-pointer hover:rounded-none w-full"
                      onClick={() => {
                        sidebarToggle(SIDEBAR_ELEMENTS.colorTokens);
                      }}
                    >
                      <SwatchBook /> Color tokens
                      <DropdownMenuShortcut>
                        {SYSTEM_OS.MAC ? '⌥ ⌘ O' : 'Alt Ctrl O'}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground cursor-pointer hover:rounded-none w-full"
                      onClick={() => {
                        sidebarToggle(SIDEBAR_ELEMENTS.nodesTree);
                      }}
                    >
                      <ListTree /> Elements tree
                      <DropdownMenuShortcut>
                        {SYSTEM_OS.MAC ? '⌥ ⌘ E' : 'Alt Ctrl E'}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
