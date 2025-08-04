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
import { type Vector2d } from 'konva/lib/types';

export type WeaveCopyPasteNodesPluginStateKeys =
  keyof typeof COPY_PASTE_NODES_PLUGIN_STATE;
export type WeaveCopyPasteNodesPluginState =
  (typeof COPY_PASTE_NODES_PLUGIN_STATE)[WeaveCopyPasteNodesPluginStateKeys];

export type WeaveCopyPasteNodesPluginOnCopyEvent = Error | undefined;
export type WeaveCopyPasteNodesPluginOnPasteEvent = Error | undefined;
export type WeaveCopyPasteNodesPluginOnPasteExternalEvent = {
  items?: ClipboardItems;
  dataList?: DataTransferItemList;
  position: Vector2d;
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
      posRelativeToSelection: Vector2d;
      containerId: string;
    }
  >;
  weaveMinPoint: Vector2d;
};

export type WeaveToPasteNode = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};
