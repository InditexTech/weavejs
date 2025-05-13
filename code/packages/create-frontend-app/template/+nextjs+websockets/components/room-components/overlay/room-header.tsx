'use client';

import React from 'react';
import { cn, SYSTEM_OS } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Grid2X2PlusIcon,
  Grid2x2XIcon,
  Grid3X3Icon,
  GripIcon,
  CheckIcon,
  Braces,
} from 'lucide-react';
import {
  WEAVE_GRID_TYPES,
  WeaveExportStageActionParams,
  WeaveStageGridPlugin,
  WeaveStageGridType,
} from '@inditextech/weave-sdk';
import { ConnectionStatus } from '../connection-status';
import { topElementVariants } from './variants';
import { DropdownMenuLabel } from '@radix-ui/react-dropdown-menu';
import { ConnectedUsers } from '../connected-users';
import { Divider } from './divider';
import { ZoomToolbar } from './zoom-toolbar';
import { HelpDrawerTrigger } from '../help/help-drawer';

export function RoomHeader() {
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
    instance?.getStore().disconnect();
    router.push('/');
  }, [instance, router]);

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
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={topElementVariants}
      className="pointer-events-none w-[calc(100%-32px)] z-1 flex gap-1 justify-center items-center absolute top-4 left-4 right-4"
    >
      <div className="w-full bg-white shadow-md flex justify-between items-center gap-0 px-3 rounded-xl border border-zinc-200">
        <div className="flex justify-start items-center gap-3">
          <DropdownMenu onOpenChange={(open: boolean) => setMenuOpen(open)}>
            <DropdownMenuTrigger
              className={cn(
                'pointer-events-auto rounded-none cursor-pointer focus:outline-none',
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
                {menuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              alignOffset={0}
              sideOffset={4}
              className="font-questrial rounded-none"
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
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 py-1 pt-2 text-zinc-600 text-xs">
                Grid
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-foreground cursor-pointer hover:rounded-none"
                onClick={handleExitRoom}
              >
                <LogOut /> Exit room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex justify-start items-center gap-1">
            <div className="flex justify-start items-center gap-2 font-questrial text-foreground !normal-case min-h-[32px]">
              <div className="font-questrial text-2xl font-extralight">
                {room}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center gap-3">
          <ConnectionStatus weaveConnectionStatus={weaveConnectionStatus} />
          <Divider />
          <div className="max-w-[320px]">
            <ConnectedUsers />
          </div>
          <Divider />
          <ZoomToolbar />
        </div>
      </div>
    </motion.div>
  );
}
