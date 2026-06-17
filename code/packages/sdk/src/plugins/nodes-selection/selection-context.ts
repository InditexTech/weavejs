// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { Weave } from '@/weave';
import type { WeaveNodesSelectionConfig } from './types';
import type { GestureDetector } from './gesture-detector';
import type { AreaSelector } from './area-selection';
import type { EdgePanning } from './edge-panning';
import type { TransformerController } from './transformer-controller';
import type { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import type { WeaveStagePanningPlugin } from '../stage-panning/stage-panning';
import type { WeaveStageGridPlugin } from '../stage-grid/stage-grid';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '../nodes-multi-selection-feedback/nodes-multi-selection-feedback';

/**
 * The minimal surface of WeaveNodesSelectionPlugin that event-handler
 * modules depend on. Keeping it separate prevents circular imports and
 * makes individual handlers independently testable via a mock context.
 */
export interface SelectionContext {
  // ── Sub-components ──────────────────────────────────────────────────────────
  getWeaveInstance(): Weave;
  getGesture(): GestureDetector;
  getAreaSelector(): AreaSelector;
  getEdgePanning(): EdgePanning;
  getTransformerController(): TransformerController;
  getConfiguration(): WeaveNodesSelectionConfig;
  getDefaultEnabledAnchors(): string[];

  // ── State reads ──────────────────────────────────────────────────────────────
  isAreaSelecting(): boolean;
  isSelecting(): boolean;
  isInitialized(): boolean;
  isActive(): boolean;
  isEnabled(): boolean;
  getSpaceKeyPressedState(): boolean;
  getPointerCount(): number;
  wasClickOrTapHandled(): boolean;

  // ── State writes ─────────────────────────────────────────────────────────────
  setAreaSelecting(val: boolean): void;
  setSpaceKeyPressed(val: boolean): void;
  registerPointer(id: number, evt: PointerEvent): void;
  unregisterPointer(id: number): void;
  setClickOrTapHandled(val: boolean): void;

  // ── Group context ────────────────────────────────────────────────────────────
  getActiveGroupContext(): string | null;
  enterGroupContext(groupId: string): void;
  exitGroupContext(): void;

  // ── Selection operations ─────────────────────────────────────────────────────
  selectNone(): void;
  setSelectedNodes(nodes: Konva.Node[]): void;
  getSelectedNodes(): (Konva.Group | Konva.Shape)[];
  removeSelectedNodes(): void;
  hideHoverState(): void;
  handleBehaviors(): void;
  handleMultipleSelectionBehavior(): void;
  triggerSelectedNodesEvent(): void;
  syncSelection(): void;

  // ── Plugin accessors ─────────────────────────────────────────────────────────
  getContextMenuPlugin(): WeaveContextMenuPlugin | undefined;
  getStagePanningPlugin(): WeaveStagePanningPlugin | undefined;
  getStageGridPlugin(): WeaveStageGridPlugin | undefined;
  getNodesSelectionFeedbackPlugin(): WeaveNodesMultiSelectionFeedbackPlugin | undefined;
}
