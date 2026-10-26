// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { Weave } from '@/weave';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WEAVE_SHAPE_LABEL_DEFAULTS } from './shape-label.constants';
import type {
  WeaveShapeLabelNode,
  WeaveShapeLabelTextBounds,
} from './shape-label.types';

/** Takes the `label-edit` mutex lock for the shape; false when refused. */
export function acquireLabelEditLock(
  instance: Weave,
  group: Konva.Group
): boolean {
  return instance.setMutexLock({
    nodeIds: [group.id()],
    operation: 'label-edit',
  });
}

/** Disables the nodes selection plugin and hides its transformer. */
export function suspendNodesSelection(instance: Weave): void {
  const selectionPlugin =
    instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  if (!selectionPlugin) return;
  const tr = selectionPlugin.getTransformer();
  instance.disablePlugin('nodesSelection');
  tr.hide();
}

/** Re-enables the selection plugin and re-selects the edited shape. */
export function resumeNodesSelection(
  instance: Weave,
  editedGroupId: string | null
): void {
  const selectionPlugin =
    instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  if (!selectionPlugin) return;
  instance.enablePlugin('nodesSelection');
  if (!editedGroupId) return;
  requestAnimationFrame(() => {
    const liveGroup = instance
      .getStage()
      .findOne<Konva.Group>(`#${editedGroupId}`);
    if (liveGroup) selectionPlugin.setSelectedNodes([liveGroup]);
  });
}

/**
 * Sizes the label to its content (auto-height), keeps at least the bounds
 * height (needed for vertical alignment) and asks the shape to grow when the
 * content overflows the bounds.
 */
export function fitLabelHeight(
  labelNode: WeaveShapeLabelNode,
  nextProps: WeaveElementAttributes,
  textBounds: WeaveShapeLabelTextBounds,
  growCallback?: (neededShapeHeight: number) => void
): void {
  // Only `attrs.height === undefined` triggers the auto height computation.
  labelNode.setAttr('height', undefined);
  const measuredHeight = labelNode.height();
  labelNode.height(Math.max(textBounds.height, measuredHeight));

  if (growCallback && measuredHeight > textBounds.height) {
    const paddingY =
      nextProps.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;
    growCallback(measuredHeight + paddingY * 2);
  }
}

/** Persists an edited label (plain mirror plus optional rich blocks). */
export function commitShapeLabel(
  instance: Weave,
  serialize: (node: Konva.Group) => {
    props: WeaveElementAttributes;
  } & Record<string, unknown>,
  nodeId: string,
  labelText: string,
  labelBlocks?: WeaveElementAttributes['labelBlocks']
): void {
  const updatedGroup = instance
    .getStage()
    .findOne<Konva.Group>(`#${nodeId}`);
  if (!updatedGroup) return;
  updatedGroup.setAttr('labelBlocks', labelBlocks);
  const serialized = serialize(updatedGroup);
  serialized.props.labelText = labelText;
  serialized.props.labelBlocks = labelBlocks;
  instance.updateNode(serialized as never);
}
