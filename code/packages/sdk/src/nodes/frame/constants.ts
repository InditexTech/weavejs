// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_FRAME_NODE_TYPE = 'frame';

export const WEAVE_FRAME_NODE_DEFAULT_CONFIG = {
  fontFamily: 'Arial',
  fontStyle: 'bold',
  fontSize: 20,
  fontColor: '#000000',
  titleMargin: 20,
  borderColor: '#000000',
  borderWidth: 1,
  onTargetEnter: {
    borderColor: '#FF6863FF',
    fill: '#FFFFFFFF',
  },
  transform: {
    rotateEnabled: false,
    resizeEnabled: false,
    enabledAnchors: [] as string[],
    borderStrokeWidth: 2,
    padding: 0,
  },
};

export const WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR = '#FFFFFFFF';

export const WEAVE_FRAME_NODE_DEFAULT_PROPS = {
  title: 'Frame XXX',
  frameWidth: 1920,
  frameHeight: 1080,
  frameBackground: WEAVE_FRAME_DEFAULT_BACKGROUND_COLOR,
};
