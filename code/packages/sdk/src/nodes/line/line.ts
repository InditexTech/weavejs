// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveSelection,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  WEAVE_LINE_NODE_DEFAULT_CONFIG,
  WEAVE_LINE_NODE_TYPE,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveLineNodeParams, WeaveLineProperties } from './types';
import { mergeExceptArrays } from '@/utils';
import { GreedySnapper } from '@/utils/greedy-snapper';
import type { Vector2d } from 'konva/lib/types';

export class WeaveLineNode extends WeaveNode {
  private config: WeaveLineProperties;
  protected snapper: GreedySnapper;
  protected startHandle: Konva.Circle | null = null;
  protected endHandle: Konva.Circle | null = null;
  protected handleNodeChanges: ((nodes: WeaveSelection[]) => void) | null;
  protected handleZoomChanges: (() => void) | null;
  protected nodeType: string = WEAVE_LINE_NODE_TYPE;

  constructor(params?: WeaveLineNodeParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_LINE_NODE_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.handleNodeChanges = null;
    this.handleZoomChanges = null;

    this.snapper = new GreedySnapper({
      snapAngles: this.config.snapAngles.angles,
      activateThreshold: this.config.snapAngles.activateThreshold,
      releaseThreshold: this.config.snapAngles.releaseThreshold,
    });
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const line = new Konva.Line({
      ...props,
      name: 'node',
      strokeScaleEnabled: true,
    });

    this.setupDefaultNodeAugmentation(line);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    line.getTransformerProperties = function () {
      return {
        ...defaultTransformerProperties,
        ignoreStroke: true,
        rotateEnabled: this.points().length !== 4,
        keepRatio: this.points().length !== 4,
        flipEnabled: this.points().length === 4,
        shiftBehavior: this.points().length === 4 ? 'none' : 'default',
        shouldOverdrawWholeArea: this.points().length !== 4,
      };
    };

    let originalStartHandleVisibility: boolean | null = null;
    let originalEndHandleVisibility: boolean | null = null;

    line.on('dragstart', () => {
      originalStartHandleVisibility = this.startHandle?.visible() ?? false;
      originalEndHandleVisibility = this.endHandle?.visible() ?? false;
      this.startHandle?.visible(false);
      this.endHandle?.visible(false);
    });

    line.on('dragend', () => {
      this.startHandle?.visible(originalStartHandleVisibility);
      this.endHandle?.visible(originalEndHandleVisibility);
      originalStartHandleVisibility = null;
      originalEndHandleVisibility = null;
    });

    line.allowedAnchors = function () {
      if (this.points().length !== 4) {
        return [
          'top-left',
          'top-center',
          'top-right',
          'middle-right',
          'middle-left',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ];
      }

      return [];
    };

    this.setupDefaultNodeEvents(line);

    if (!this.handleZoomChanges) {
      this.handleZoomChanges = () => {
        if (this.startHandle) {
          this.startHandle.scale({
            x: 1 / this.instance.getStage().scaleX(),
            y: 1 / this.instance.getStage().scaleY(),
          });
        }
        if (this.endHandle) {
          this.endHandle.scale({
            x: 1 / this.instance.getStage().scaleX(),
            y: 1 / this.instance.getStage().scaleY(),
          });
        }
      };

      this.instance.addEventListener('onZoomChange', this.handleZoomChanges);
    }

    if (!this.handleNodeChanges) {
      this.handleNodeChanges = (nodes: WeaveSelection[]) => {
        if (
          nodes.length === 1 &&
          nodes[0].instance.getAttrs().nodeType === 'line' &&
          (nodes[0].instance as Konva.Line).points().length === 4
        ) {
          const lineSelected = this.instance
            .getStage()
            .findOne(`#${nodes[0].instance.getAttrs().id}`) as Konva.Line;

          if (!lineSelected) {
            return;
          }

          this.setupHandles();
          this.showHandles(lineSelected);
        } else {
          this.startHandle?.setAttr('lineId', undefined);
          this.startHandle?.visible(false);
          this.endHandle?.setAttr('lineId', undefined);
          this.endHandle?.visible(false);
        }
      };

      this.instance.addEventListener('onNodesChange', this.handleNodeChanges);
    }

    return line;
  }

  private defineFinalPoint(
    handle: Konva.Circle,
    origin: Konva.Vector2d,
    e: Konva.KonvaEventObject<DragEvent>
  ): Konva.Vector2d {
    let pos: Vector2d = { x: 0, y: 0 };

    if (e.evt.shiftKey) {
      const handlePosition: Konva.Vector2d = handle.position();

      let dx = handlePosition.x - origin.x;
      let dy = handlePosition.y - origin.y;

      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;
      const snapped = this.snapper.apply(angleDeg);

      const dist = Math.hypot(dx, dy);
      const rad = (snapped * Math.PI) / 180;
      dx = Math.cos(rad) * dist;
      dy = Math.sin(rad) * dist;

      pos.x = origin.x + dx;
      pos.y = origin.y + dy;
    } else {
      pos = handle.position();
    }

    return pos;
  }

  private setupHandles(): void {
    if (!this.startHandle) {
      const startHandle = new Konva.Circle({
        id: 'line-start-handle',
        radius: 5,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
        edgeDistanceDisableOnDrag: true,
        scaleX: 1 / this.instance.getStage().scaleX(),
        scaleY: 1 / this.instance.getStage().scaleY(),
        draggable: true,
      });

      startHandle.on('pointerover', () => {
        this.instance.getStage().container().style.cursor = 'move';
      });

      startHandle.on('pointerout', () => {
        this.instance.getStage().container().style.cursor = 'default';
      });

      startHandle.on('dragstart', (e) => {
        const lineId = e.target.getAttr('lineId');

        const line = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!line) {
          return;
        }

        if (line.points().length === 4) {
          line.setAttr('eventTarget', true);
        }

        this.instance.emitEvent('onDrag', e.target);
      });

      startHandle.on('dragmove', (e) => {
        const draggedTarget = e.target;
        const lineId = draggedTarget.getAttr('lineId');

        const draggedLine = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!draggedLine) {
          return;
        }

        const parentPosition = this.getParentPosition(draggedLine);

        const pos: Vector2d = this.defineFinalPoint(
          startHandle,
          {
            x: parentPosition.x + draggedLine.x() + draggedLine.points()[2],
            y: parentPosition.y + draggedLine.y() + draggedLine.points()[3],
          },
          e
        );
        const [, , x2, y2] = draggedLine.points();
        startHandle.position(pos);

        draggedLine.points([
          pos.x - parentPosition.x - draggedLine.x(),
          pos.y - parentPosition.y - draggedLine.y(),
          x2,
          y2,
        ]);
      });

      startHandle.on('dragend', (e) => {
        const draggedTarget = e.target;
        const lineId = draggedTarget.getAttr('lineId');

        const draggedLine = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!draggedLine) {
          return;
        }

        const parentPosition = this.getParentPosition(draggedLine);

        const { x, y } = startHandle.position();
        const [, , x2, y2] = draggedLine.points();

        draggedLine.points([
          x - parentPosition.x - draggedLine.x(),
          y - parentPosition.y - draggedLine.y(),
          x2,
          y2,
        ]);

        this.instance.updateNode(this.serialize(draggedLine));

        this.instance.emitEvent('onDrag', null);
      });

      this.startHandle = startHandle;
      this.startHandle.visible(false);

      this.instance.getSelectionLayer()?.add(this.startHandle);
    }

    if (!this.endHandle) {
      const endHandle = new Konva.Circle({
        id: 'line-end-handle',
        radius: 5,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
        edgeDistanceDisableOnDrag: true,
        scaleX: 1 / this.instance.getStage().scaleX(),
        scaleY: 1 / this.instance.getStage().scaleY(),
        draggable: true,
      });

      endHandle.on('pointerover', () => {
        this.instance.getStage().container().style.cursor = 'move';
      });

      endHandle.on('pointerout', () => {
        this.instance.getStage().container().style.cursor = 'default';
      });

      endHandle.on('dragstart', (e) => {
        const lineId = e.target.getAttr('lineId');

        const line = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!line) {
          return;
        }

        if (line.points().length === 4) {
          line.setAttr('eventTarget', true);
        }

        this.instance.emitEvent('onDrag', e.target);
      });

      endHandle.on('dragmove', (e) => {
        const draggedTarget = e.target;
        const lineId = draggedTarget.getAttr('lineId');

        const draggedLine = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!draggedLine) {
          return;
        }

        const parentPosition = this.getParentPosition(draggedLine);

        const pos: Vector2d = this.defineFinalPoint(
          endHandle,
          {
            x: parentPosition.x + draggedLine.x() + draggedLine.points()[0],
            y: parentPosition.y + draggedLine.y() + draggedLine.points()[1],
          },
          e
        );
        const [x1, y1] = draggedLine.points();
        endHandle.position(pos);

        draggedLine.points([
          x1,
          y1,
          pos.x - parentPosition.x - draggedLine.x(),
          pos.y - parentPosition.y - draggedLine.y(),
        ]);
      });

      endHandle.on('dragend', (e) => {
        const draggedTarget = e.target;
        const lineId = draggedTarget.getAttr('lineId');

        const draggedLine = this.instance
          .getStage()
          .findOne(`#${lineId}`) as Konva.Line;

        if (!draggedLine) {
          return;
        }

        const parentPosition = this.getParentPosition(draggedLine);

        const { x, y } = endHandle.position();
        const [x1, y1] = draggedLine.points();

        draggedLine.points([
          x1,
          y1,
          x - parentPosition.x - draggedLine.x(),
          y - parentPosition.y - draggedLine.y(),
        ]);

        this.instance.updateNode(this.serialize(draggedLine));

        this.instance.emitEvent('onDrag', null);
      });

      this.endHandle = endHandle;
      this.endHandle.visible(false);

      this.instance.getSelectionLayer()?.add(this.endHandle);
    }
  }

  private showHandles(line: Konva.Line): void {
    const [x1, y1, x2, y2] = line.points();

    if (this.startHandle === null || this.endHandle === null) {
      return;
    }

    const parentPosition = this.getParentPosition(line);

    const lineId = line.getAttrs().id;
    this.startHandle.setAttr('lineId', lineId);
    this.startHandle.setAttr('targetNode', lineId);
    this.startHandle.x(parentPosition.x + line.x() + x1);
    this.startHandle.y(parentPosition.y + line.y() + y1);
    this.startHandle.visible(true);
    this.startHandle.moveToTop();

    this.endHandle.setAttr('lineId', lineId);
    this.endHandle.setAttr('targetNode', lineId);
    this.endHandle.x(parentPosition.x + line.x() + x2);
    this.endHandle.y(parentPosition.y + line.y() + y2);
    this.endHandle.visible(true);
    this.endHandle.moveToTop();
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Line): void {
    const scale = node.scale();

    const oldPoints = node.points();
    const newPoints = [];

    for (let i = 0; i < oldPoints.length; i += 2) {
      const x = oldPoints[i] * scale.x;
      const y = oldPoints[i + 1] * scale.y;
      newPoints.push(x, y);
    }

    node.points(newPoints);

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  private getParentPosition(line: Konva.Line): Konva.Vector2d {
    const stage = this.instance.getStage();

    let parentPosition: Konva.Vector2d = { x: 0, y: 0 };
    if (line?.getParent()?.getAttrs().nodeId !== undefined) {
      const realContainer = stage.findOne(
        `#${line.getParent()?.getAttrs().nodeId}`
      );
      if (realContainer) {
        parentPosition = {
          x: realContainer.x() ?? 0,
          y: realContainer.y() ?? 0,
        };
      }
    }

    return parentPosition;
  }
}
