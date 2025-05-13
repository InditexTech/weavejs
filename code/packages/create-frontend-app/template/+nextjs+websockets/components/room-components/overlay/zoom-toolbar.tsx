'use client';

import React from 'react';
import { SYSTEM_OS } from '@/lib/utils';
import { useWeave } from '@inditextech/weave-react';
import { Fullscreen, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { ToolbarButton } from '../toolbar/toolbar-button';
import { ShortcutElement } from '../help/shortcut-element';

export function ZoomToolbar() {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);

  const selectedNodes = useWeave((state) => state.selection.nodes);
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
          <div className="flex justify-start items-center gap-1">
            <ToolbarButton
              icon={<ZoomIn />}
              disabled={!canZoomIn}
              onClick={() => {
                handleTriggerActionWithParams('zoomInTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  {' '}
                  <p>Zoom in</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⌘ +',
                      [SYSTEM_OS.OTHER]: 'Ctrl +',
                    }}
                  />
                </div>
              }
              tooltipSide="top"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<ZoomOut />}
              disabled={!canZoomOut}
              onClick={() => {
                handleTriggerActionWithParams('zoomOutTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Zoom out</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⌘ -',
                      [SYSTEM_OS.OTHER]: 'Ctrl -',
                    }}
                  />
                </div>
              }
              tooltipSide="top"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<Maximize />}
              onClick={() => {
                handleTriggerActionWithParams('fitToScreenTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Fit to screen</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⇧ 1',
                      [SYSTEM_OS.OTHER]: '⇧ 1',
                    }}
                  />
                </div>
              }
              tooltipSide="top"
              tooltipAlign="end"
            />
            <ToolbarButton
              icon={<Fullscreen />}
              disabled={selectedNodes.length === 0}
              onClick={() => {
                handleTriggerActionWithParams('fitToSelectionTool', {
                  previousAction: actualAction,
                });
              }}
              label={
                <div className="flex flex-col gap-2 justify-start items-end">
                  <p>Fit to selection</p>
                  <ShortcutElement
                    variant="light"
                    shortcuts={{
                      [SYSTEM_OS.MAC]: '⇧ 2',
                      [SYSTEM_OS.OTHER]: '⇧ 2',
                    }}
                  />
                </div>
              }
              tooltipSide="top"
              tooltipAlign="end"
            />
          </div>
          <div className="w-full px-4 font-questrial flex justify-end items-center text-muted-foreground">
            {parseFloat(`${zoomValue * 100}`).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
