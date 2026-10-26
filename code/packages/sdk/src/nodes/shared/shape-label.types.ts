// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type {
  WeaveTextBlock,
  WeaveTextSelectionFormat,
} from '@/nodes/text-v2/model';
import type { TextEditSession } from '@/nodes/text-v2/edit/session';

export type WeaveShapeLabelProps = {
  labelText?: string;
  labelFontFamily?: string;
  labelFontSize?: number;
  labelFontStyle?: string;
  labelFontVariant?: string;
  labelTextDecoration?: string;
  labelFill?: string;
  labelAlign?: string;
  labelVerticalAlign?: string;
  labelLetterSpacing?: number;
  labelLineHeight?: number;
  labelPaddingX?: number;
  labelPaddingY?: number;
  /** Rich content written by the `native` engine; `labelText` is its plain mirror. */
  labelBlocks?: WeaveTextBlock[];
};

export type WeaveShapeLabelTextBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Label engine: `legacy` (Konva.Text + DOM textarea) or `native` (on-canvas). */
export type WeaveShapeLabelEngineKind = 'legacy' | 'native';

export type WeaveShapeLabelConfig = {
  /** Engine used to render and edit labels. Defaults to `legacy`. */
  engine: WeaveShapeLabelEngineKind;
};

/** Node rendering the label text. Both engines return a `Konva.Shape`. */
export type WeaveShapeLabelNode = Konva.Shape;

/** Contract shared by the legacy and native label engines. */
export interface WeaveShapeLabelEngine {
  isEditing(): boolean;
  renderLabel(
    group: Konva.Group,
    props: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds
  ): WeaveShapeLabelNode;
  updateLabel(
    group: Konva.Group,
    nextProps: WeaveElementAttributes,
    textBounds: WeaveShapeLabelTextBounds,
    growCallback?: (neededShapeHeight: number) => void
  ): void;
  triggerEditMode(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds,
    onCommit: (labelText: string, labelBlocks?: WeaveTextBlock[]) => void,
    onLiveResize?: (neededShapeHeight: number) => void
  ): void;
  exitEditMode(): void;
  repositionTextArea(
    group: Konva.Group,
    textBounds: WeaveShapeLabelTextBounds
  ): void;
}

/** Emitted by the `native` label engine when a label edit session starts. */
export type WeaveShapeLabelOnEnterEditMode = {
  node: Konva.Group;
  /** Live session: run format commands (`toggleMark`, ...) on it. */
  session: TextEditSession;
};

/** Selection format changed during a native label edit session. */
export type WeaveShapeLabelOnFormatChange = {
  node: Konva.Group;
  format: WeaveTextSelectionFormat;
};

/** Emitted by the `native` label engine when a label edit session ends. */
export type WeaveShapeLabelOnExitEditMode = { node: Konva.Group };
