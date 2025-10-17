// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  COPY_PASTE_NODES_PLUGIN_STATE,
  WEAVE_COPY_PASTE_PASTE_MODES,
} from './constants';
import {
  type NodeSerializable,
  type WeaveStateElement,
} from '@inditextech/weave-types';

export type WeaveCopyPasteNodesPluginStateKeys =
  keyof typeof COPY_PASTE_NODES_PLUGIN_STATE;
export type WeaveCopyPasteNodesPluginState =
  (typeof COPY_PASTE_NODES_PLUGIN_STATE)[WeaveCopyPasteNodesPluginStateKeys];

export type WeaveCopyPasteNodesPluginOnCopyEvent =
  | { error?: Error }
  | undefined;
export type WeaveCopyPasteNodesPluginOnPasteEvent = {
  error?: Error;
  pastedNodes?: string[];
};
export type WeaveCopyPasteNodesPluginOnPasteExternalEvent = {
  items?: ClipboardItems;
  dataList?: DataTransferItemList;
  positionCalculated: boolean;
  position: Konva.Vector2d;
};

export type WeaveCopyPastePasteModeKeys =
  keyof typeof WEAVE_COPY_PASTE_PASTE_MODES;
export type WeaveCopyPastePasteMode =
  (typeof WEAVE_COPY_PASTE_PASTE_MODES)[WeaveCopyPastePasteModeKeys];

export type WeavePasteModel = {
  weaveInstanceId: string;
  weave: Record<
    string,
    {
      element: WeaveStateElement;
      posRelativeToSelection: Konva.Vector2d;
      containerId: string;
    }
  >;
  weaveMinPoint: Konva.Vector2d;
};

export type WeaveToPasteNode = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};

export type PaddingOnPaste = {
  enabled: boolean;
  paddingX: number;
  paddingY: number;
};

export type WeaveCopyPasteNodesPluginConfig = {
  paddingOnPaste: PaddingOnPaste;
};

export type WeaveCopyPasteNodesPluginParams = {
  config?: Partial<WeaveCopyPasteNodesPluginConfig>;
};
