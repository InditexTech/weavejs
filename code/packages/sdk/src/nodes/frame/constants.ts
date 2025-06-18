// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_FRAME_NODE_TYPE = 'frame';

export const WEAVE_FRAME_NODE_DEFAULT_CONFIG = {
  fontFamily: 'Arial',
  fontStyle: 'bold',
  fontSize: 20,
  fontColor: '#000000ff',
  titleMargin: 20,
  borderColor: '#000000ff',
  borderWidth: 1,
  onTargetLeave: {
    borderColor: '#000000ff',
    fill: '#ffffffff',
  },
  onTargetEnter: {
    borderColor: '#ff6863ff',
    fill: '#ffffffff',
  },
  transform: {
    rotateEnabled: false,
    resizeEnabled: false,
    enabledAnchors: [] as string[],
    borderStrokeWidth: 3,
    padding: 0,
  },
};

export const WEAVE_FRAME_NODE_DEFAULT_PROPS = {
  title: 'Frame XXX',
  frameWidth: 1920,
  frameHeight: 1080,
};
