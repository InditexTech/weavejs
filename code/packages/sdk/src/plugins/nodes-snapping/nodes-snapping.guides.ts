// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import { GUIDE_KIND, GUIDE_NAME, GUIDE_ORIENTATION } from './constants';
import type {
  Guide,
  GuideKindOnlyCustomOrStatic,
  SnapMatch,
  SnappingManagerStyle,
  SnapPoint,
  SnapResult,
  VisibleWorldRect,
} from './types';
import Konva from 'konva';
import { WeaveNodesSnappingCustomGuides } from './nodes-snapping.custom-guides';
import type { Weave } from '@/weave';
import { applySnap, getNodeRect, getNodesRect } from './utils';
import type { BoundingBox } from '@inditextech/weave-types';

export class WeaveNodesSnappingGuides {
  config: { tolerance: number; style: SnappingManagerStyle };
  instance: Weave;
  layer!: Konva.Layer;
  customGuidesManager!: WeaveNodesSnappingCustomGuides;

  constructor(
    instance: Weave,
    customGuidesManager: WeaveNodesSnappingCustomGuides,
    layer: Konva.Layer,
    config: {
      tolerance: number;
      style: SnappingManagerStyle;
    }
  ) {
    this.instance = instance;
    this.customGuidesManager = customGuidesManager;
    this.layer = layer;
    this.config = config;
  }

  performSnapping(
    nodes: Konva.Node[],
    nodesOffsets: Konva.Vector2d[],
    relativeTo: Konva.Container,
    snappingGuides: Guide[]
  ): void {
    const snapPoints = this.getNodeSnapPoints(nodes, relativeTo);

    const { snap } = this.findSnapMatches(snappingGuides, snapPoints);

    applySnap(nodes, nodesOffsets, snap);

    this.clearSnapGuides();

    if (snap.vertical) {
      this.renderSnapGuides(relativeTo, snap.vertical);
    }
    if (snap.horizontal) {
      this.renderSnapGuides(relativeTo, snap.horizontal);
    }
  }

  private getNodeSnapPoints(
    nodes: Konva.Node[],
    relativeTo: Konva.Container | null
  ): SnapPoint[] {
    if (!relativeTo) {
      return [];
    }

    let box: BoundingBox | null = null;
    if (nodes.length === 1) {
      box = getNodeRect(nodes[0], relativeTo);
    } else {
      box = getNodesRect(nodes, relativeTo);
    }

    return [
      {
        guideId: `node-vertical-start`,
        orientation: GUIDE_ORIENTATION.VERTICAL,
        kind: GUIDE_KIND.STATIC,
        value: box.x,
        offset: 0,
      },
      {
        guideId: `node-vertical-center`,
        orientation: GUIDE_ORIENTATION.VERTICAL,
        kind: GUIDE_KIND.STATIC,
        value: box.x + box.width / 2,
        offset: -box.width / 2,
      },
      {
        guideId: `node-vertical-end`,
        orientation: GUIDE_ORIENTATION.VERTICAL,
        kind: GUIDE_KIND.STATIC,
        value: box.x + box.width,
        offset: -box.width,
      },
      {
        guideId: `node-horizontal-start`,
        orientation: GUIDE_ORIENTATION.HORIZONTAL,
        kind: GUIDE_KIND.STATIC,
        value: box.y,
        offset: 0,
      },
      {
        guideId: `node-horizontal-center`,
        orientation: GUIDE_ORIENTATION.HORIZONTAL,
        kind: GUIDE_KIND.STATIC,
        value: box.y + box.height / 2,
        offset: -box.height / 2,
      },
      {
        guideId: `node-horizontal-end`,
        orientation: GUIDE_ORIENTATION.HORIZONTAL,
        kind: GUIDE_KIND.STATIC,
        value: box.y + box.height,
        offset: -box.height,
      },
    ];
  }

  private findSnapMatches(
    guides: Guide[],
    snapPoints: SnapPoint[]
  ): { snap: SnapResult; vertical: SnapMatch[]; horizontal: SnapMatch[] } {
    const tolerance = this.config.tolerance;
    const vertical: SnapMatch[] = [];
    const horizontal: SnapMatch[] = [];

    for (const guide of guides) {
      for (const point of snapPoints) {
        if (guide.orientation !== point.orientation) continue;

        const diff = Math.abs(guide.value - point.value);
        if (diff > tolerance) continue;

        const match: SnapMatch = {
          orientation: guide.orientation,
          guideId: guide.guideId,
          containerId: guide.containerId,
          guide: guide.value,
          offset: point.offset,
          diff,
          kind: guide.kind as 'static' | 'custom',
        };

        if (guide.orientation === GUIDE_ORIENTATION.VERTICAL) {
          vertical.push(match);
        } else {
          horizontal.push(match);
        }
      }
    }

    vertical.sort((a, b) => a.diff - b.diff);
    horizontal.sort((a, b) => a.diff - b.diff);

    return {
      snap: {
        vertical: vertical[0],
        horizontal: horizontal[0],
      },
      vertical,
      horizontal,
    };
  }

  private getVisibleStageRect(container: Konva.Node): VisibleWorldRect {
    const stage = this.instance.getStage();
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const mainLayer = this.instance.getMainLayer();

    // For the main layer, guide lines extend across the visible viewport.
    if (container === stage || container === mainLayer) {
      const pos = stage.position();
      return {
        x: -pos.x / scaleX,
        y: -pos.y / scaleY,
        width: stage.width() / scaleX,
        height: stage.height() / scaleY,
      };
    }

    // For any other container (frame, group):
    //   • if the container itself is a frame, clip to the frame's bounds.
    //   • if the container is a group, walk up to find the nearest frame ancestor.
    //     – frame found  → clip to the frame's bounds.
    //     – no frame     → use the stage viewport (group on main layer).
    let frameNode: Konva.Node | null = null;
    let cur: Konva.Node | null = container;
    while (cur && cur !== mainLayer && cur !== stage) {
      if (cur.getAttrs().nodeType === 'frame') {
        frameNode = cur;
        break;
      }
      cur = cur.getParent();
    }

    if (frameNode) {
      const rect = frameNode.getClientRect({
        relativeTo: stage as unknown as Konva.Container,
      });
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }

    // No frame ancestor — use the stage viewport.
    const pos = stage.position();
    return {
      x: -pos.x / scaleX,
      y: -pos.y / scaleY,
      width: stage.width() / scaleX,
      height: stage.height() / scaleY,
    };
  }

  renderSnapGuides(container: Konva.Container, snap: SnapMatch): void {
    const stage = this.instance.getStage();
    const visible = this.getVisibleStageRect(container);

    const snapKind = snap.kind as GuideKindOnlyCustomOrStatic;

    if (snap.orientation === GUIDE_ORIENTATION.VERTICAL) {
      let value = snap.guide;

      if (snap.containerId !== 'mainLayer') {
        const containerNode = stage.findOne(`#${snap.containerId}`);
        if (containerNode) {
          // snap.guide is in the container's local coordinate space.
          // To draw it on the snapping layer we need the equivalent scene
          // coordinate (before the stage pan/zoom transform).
          //
          // Step 1 — container-local → canvas pixels:
          //   containerNode.getAbsoluteTransform() includes all ancestor
          //   transforms up to and including the stage's pan/zoom.
          // Step 2 — canvas pixels → scene:
          //   Undo the stage transform so the result is in the same space as
          //   the Konva layer (scene / mainLayer space).
          //
          // getClientRect({ relativeTo: stage }) would give scene coords but
          // also includes the bbox min-child offset, which is wrong for groups
          // that have no background rect at their local (0,0).
          const canvasPt = containerNode
            .getAbsoluteTransform()
            .point({ x: snap.guide, y: 0 });
          value = stage
            .getAbsoluteTransform()
            .copy()
            .invert()
            .point(canvasPt).x;
        }
      }

      this.layer.add(
        new Konva.Line({
          name: GUIDE_NAME,
          points: [value, visible.y, value, visible.y + visible.height],
          stroke: this.config.style[snapKind].selected.stroke,
          strokeWidth:
            this.config.style[snapKind].selected.strokeWidth / stage.scaleX(), // keeps it thin on zoom
          dash: this.config.style[snapKind].selected.dash?.map(
            (d) => d / stage.scaleX()
          ),
          opacity: this.config.style[snapKind].selected.opacity,
          listening: false,
        })
      );
    }

    if (snap.orientation === GUIDE_ORIENTATION.HORIZONTAL) {
      let value = snap.guide;

      if (snap.containerId !== 'mainLayer') {
        const containerNode = stage.findOne(`#${snap.containerId}`);
        if (containerNode) {
          const canvasPt = containerNode
            .getAbsoluteTransform()
            .point({ x: 0, y: snap.guide });
          value = stage
            .getAbsoluteTransform()
            .copy()
            .invert()
            .point(canvasPt).y;
        }
      }

      this.layer.add(
        new Konva.Line({
          name: GUIDE_NAME,
          points: [visible.x, value, visible.x + visible.width, value],
          stroke: this.config.style[snapKind].selected.stroke,
          strokeWidth:
            this.config.style[snapKind].selected.strokeWidth / stage.scaleX(), // keeps it thin on zoom
          dash: this.config.style[snapKind].selected.dash?.map(
            (d) => d / stage.scaleX()
          ),
          opacity: this.config.style[snapKind].selected.opacity,
          listening: false,
        })
      );
    }

    this.layer.batchDraw();
  }

  clearSnapGuides(): void {
    this.layer.find(`.${GUIDE_NAME}`).forEach((n) => n.destroy());
    this.layer.batchDraw();
  }

  async copyContainerGuidesToClipboard(containerId: string) {
    const allGuides = this.customGuidesManager.getAllCustomGuides();

    const containerGuides = allGuides[containerId] ?? [];

    if (containerGuides.length === 0) {
      throw new Error('No guides to copy');
    }

    const container = this.instance.getStage().findOne(`#${containerId}`);

    if (!container) {
      throw new Error('Container not found');
    }

    const containerKind = container.getAttrs().nodeType;

    const guidesElement = {
      weave: {
        kind: 'guides',
        containerKind,
        guides: containerGuides,
      },
    };

    await navigator.clipboard.writeText(JSON.stringify(guidesElement, null, 2));
  }

  async pasteGuidesFromClipboard(containerId: string) {
    const container = this.instance.getStage().findOne(`#${containerId}`);

    if (!container) {
      throw new Error('Container not found');
    }

    const text = await navigator.clipboard.readText();

    let data = null;
    try {
      data = JSON.parse(text);

      if (data?.weave?.kind === 'guides') {
        for (const guide of data.weave.guides) {
          const toSaveGuide = {
            ...guide,
            kind: 'custom',
            guideId: nanoid(10),
            containerId: containerId,
            persist: true,
          };
          this.customGuidesManager.saveCustomGuide(toSaveGuide);
        }

        this.customGuidesManager.renderAllVisibleCustomGuides();
      } else {
        throw new Error('Clipboard does not contain valid guides data');
      }
    } catch {
      throw new Error('Cannot parse clipboard data as guides');
    }
  }

  getGuidesFromOtherNodes(
    draggedNodes: Konva.Node[],
    candidates: Konva.Node[],
    relativeTo: Konva.Container
  ): Guide[] {
    if (!relativeTo) {
      return [];
    }

    const guides: Guide[] = [];

    for (const node of candidates) {
      if (draggedNodes.includes(node)) continue;
      if (!node.isVisible()) continue;

      const rect = getNodeRect(node, relativeTo);
      const id = node.id();

      guides.push(
        {
          orientation: GUIDE_ORIENTATION.VERTICAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.x,
          guideId: id,
          containerId: relativeTo.id(),
        },
        {
          orientation: GUIDE_ORIENTATION.VERTICAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.x + rect.width / 2,
          guideId: id,
          containerId: relativeTo.id(),
        },
        {
          orientation: GUIDE_ORIENTATION.VERTICAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.x + rect.width,
          guideId: id,
          containerId: relativeTo.id(),
        },
        {
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.y,
          guideId: id,
          containerId: relativeTo.id(),
        },
        {
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.y + rect.height / 2,
          guideId: id,
          containerId: relativeTo.id(),
        },
        {
          orientation: GUIDE_ORIENTATION.HORIZONTAL,
          kind: GUIDE_KIND.STATIC,
          value: rect.y + rect.height,
          guideId: id,
          containerId: relativeTo.id(),
        }
      );
    }

    return guides;
  }
}
