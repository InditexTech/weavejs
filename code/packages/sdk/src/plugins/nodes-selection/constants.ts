// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_NODES_SELECTION_KEY = 'nodesSelection';
export const WEAVE_NODES_SELECTION_LAYER_ID = 'selectionLayer';

export const WEAVE_NODES_SELECTION_DEFAULT_CONFIG = {
  selection: {
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
    rotationSnapTolerance: 3,
    ignoreStroke: true,
    rotateEnabled: true,
    resizeEnabled: true,
    flipEnabled: false,
    keepRatio: true,
    useSingleNodeRotation: true,
    shouldOverdrawWholeArea: true,
    enabledAnchors: [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'middle-left',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    anchorStyleFunc: (anchor: any) => {
      anchor.stroke('#27272aff');
      anchor.cornerRadius(12);
      if (anchor.hasName('top-center') || anchor.hasName('bottom-center')) {
        anchor.height(8);
        anchor.offsetY(4);
        anchor.width(32);
        anchor.offsetX(16);
      }
      if (anchor.hasName('middle-left') || anchor.hasName('middle-right')) {
        anchor.height(32);
        anchor.offsetY(16);
        anchor.width(8);
        anchor.offsetX(4);
      }
    },
    borderStroke: '#1a1aff',
    borderStrokeWidth: 2,
  },
  hover: {
    borderStrokeWidth: 2,
  },
  selectionArea: {
    fill: '#1a1aff11',
    stroke: '#1a1aff',
    strokeWidth: 1,
    dash: [12, 4],
  },
  panningWhenSelection: {
    edgeThreshold: 50,
    minScrollSpeed: 1,
    maxScrollSpeed: 15,
  },
  behaviors: {
    singleSelection: { enabled: true },
    multipleSelection: { enabled: false },
    onMultipleSelection: () => {
      return {
        resizeEnabled: true,
        rotateEnabled: true,
        enabledAnchors: [
          'top-left',
          'top-center',
          'top-right',
          'middle-right',
          'middle-left',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ],
      };
    },
  },
};
