'use client';

import React from 'react';
import { SYSTEM_OS } from '@/lib/utils';
import { useWeave } from '@inditextech/weave-react';
import { Fullscreen, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { ToolbarButton } from '../toolbar/toolbar-button';
import { ShortcutElement } from '../help/shortcut-element';
import { WEAVE_STORE_CONNECTION_STATUS } from '@inditextech/weave-types';

export function ZoomToolbar() {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const weaveConnectionStatus = useWeave((state) => state.connection.status);

  const zoomValue = useWeave((state) => state.zoom.value);
  const canZoomIn = useWeave((state) => state.zoom.canZoomIn);
  const canZoomOut = useWeave((state) => state.zoom.canZoomOut);

  const handleTriggerActionWithParams = React.useCallback(
    (actionName: string, params: unknown) => {
      if (instance) {
        const triggerSelection = actualAction === 'selectionTool';
        instance.triggerAction(actionName, params);
        if (triggerSelection) {
          instance.triggerAction('selectionTool');
        }
      }
    },
    [instance, actualAction]
  );

  return (
    <div className="flex justify-end gap-2 items-center">
      <div className="gap-1 flex justify-end items-center">
        <div className="w-full grid grid-cols-[auto_1fr]">
          <div className="flex justify-start items-center gap-[16px]">
            <ToolbarButton
              icon={<ZoomIn size={20} strokeWidth={1} />}
              disabled={
                !canZoomIn ||
                weaveConnectionStatus !==
                  WEAVE_STORE_CONNECTION_STATUS.CONNECTED
              }
              onClick={() => {
                handleTriggerActionWithParams('zoomInTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex gap-3 justify-start items-center">
                  <p>Zoom in</p>
                  <ShortcutElement
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⌘ +',
                      [SYSTEM_OS.OTHER]: 'Ctrl +',
                    }}
                  />
                </div>
              }
              variant="squared"
              tooltipSide="bottom"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<ZoomOut size={20} strokeWidth={1} />}
              disabled={
                !canZoomOut ||
                weaveConnectionStatus !==
                  WEAVE_STORE_CONNECTION_STATUS.CONNECTED
              }
              onClick={() => {
                handleTriggerActionWithParams('zoomOutTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex gap-3 justify-start items-center">
                  <p>Zoom out</p>
                  <ShortcutElement
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⌘ -',
                      [SYSTEM_OS.OTHER]: 'Ctrl -',
                    }}
                  />
                </div>
              }
              variant="squared"
              tooltipSide="bottom"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<Maximize size={20} strokeWidth={1} />}
              disabled={
                weaveConnectionStatus !==
                WEAVE_STORE_CONNECTION_STATUS.CONNECTED
              }
              onClick={() => {
                handleTriggerActionWithParams('fitToScreenTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex gap-3 justify-start items-center">
                  <p>Fit to screen</p>
                  <ShortcutElement
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⇧ 1',
                      [SYSTEM_OS.OTHER]: '⇧ 1',
                    }}
                  />
                </div>
              }
              variant="squared"
              tooltipSide="bottom"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<Fullscreen size={20} strokeWidth={1} />}
              disabled={
                weaveConnectionStatus !==
                WEAVE_STORE_CONNECTION_STATUS.CONNECTED
              }
              onClick={() => {
                handleTriggerActionWithParams('fitToSelectionTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex gap-3 justify-start items-center">
                  <p>Fit to selection</p>
                  <ShortcutElement
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⇧ 2',
                      [SYSTEM_OS.OTHER]: '⇧ 2',
                    }}
                  />
                </div>
              }
              variant="squared"
              tooltipSide="bottom"
              tooltipAlign="end"
            />
          </div>
          <div className="w-[75px] px-4 font-inter flex justify-center items-center text-muted-foreground">
            {parseFloat(`${zoomValue * 100}`).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
