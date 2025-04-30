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

export type WeaveCopyPasteNodesCanCopyChangeCallback = (
  canCopy: boolean
) => void;
export type WeaveCopyPasteNodesCanPasteChangeCallback = (
  canPaste: boolean,
  nodes: WeaveToPasteNode[]
) => void;
export type WeaveCopyPasteNodesOnCopyCallback = (error?: Error) => void;
export type WeaveCopyPasteNodesOnPasteCallback = (error?: Error) => void;
export type WeaveCopyPasteNodesOnPasteExternalCallback = (
  item: ClipboardItem
) => void;

export type WeaveCopyPasteNodesPluginCallbacks = {
  onCopy?: WeaveCopyPasteNodesOnCopyCallback;
  onPaste?: WeaveCopyPasteNodesOnPasteCallback;
  onPasteExternal?: WeaveCopyPasteNodesOnPasteExternalCallback;
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
