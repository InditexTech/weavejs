// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { COPY_PASTE_NODES_PLUGIN_STATE } from './constants';
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
  item: ClipboardItem;
  position: Vector2d;
};

export type WeavePasteModel = {
  weaveInstanceId: string;
  weave: Record<string, WeaveStateElement>;
  weaveMinPoint: Vector2d;
};

export type WeaveToPasteNode = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};
