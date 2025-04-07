// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { COPY_PASTE_NODES_PLUGIN_STATE } from './constants';
import { NodeSerializable } from '@inditextech/weavejs-types';

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
export type WeaveCopyPasteNodesOnPasteExternalImageCallback = (
  blob: Blob
) => void;

export type WeaveCopyPasteNodesPluginCallbacks = {
  onCanCopyChange?: WeaveCopyPasteNodesCanCopyChangeCallback;
  onCanPasteChange?: WeaveCopyPasteNodesCanPasteChangeCallback;
  onPasteExternalImage?: WeaveCopyPasteNodesOnPasteExternalImageCallback;
};

export type WeaveToPasteNode = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};
