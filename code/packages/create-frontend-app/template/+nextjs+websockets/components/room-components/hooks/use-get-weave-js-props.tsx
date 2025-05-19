/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import {
  WeaveBrushToolAction,
  WeaveFrameToolAction,
  WeaveImageToolAction,
  WeavePenToolAction,
  WeaveRectangleToolAction,
} from '@inditextech/weave-sdk';
import { ACTIONS, FONTS, NODES } from '@/components/utils/constants';
import { ColorTokenToolAction } from '@/components/actions/color-token-tool/color-token-tool';

function useGetWeaveJSProps() {
  const memoizedActions = React.useMemo(
    () => [
      new WeaveRectangleToolAction(),
      new WeavePenToolAction(),
      new WeaveBrushToolAction(),
      new WeaveImageToolAction(),
      new WeaveFrameToolAction(),
      new ColorTokenToolAction(),
      ...ACTIONS,
    ],
    []
  );

  return {
    fonts: FONTS,
    nodes: NODES,
    actions: memoizedActions,
  };
}

export default useGetWeaveJSProps;
