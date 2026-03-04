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
  WEAVE_STROKE_SINGLE_NODE_DEFAULT_CONFIG,
  WEAVE_STROKE_SINGLE_NODE_TIP_SIDE,
  WEAVE_STROKE_SINGLE_NODE_TIP_TYPE,
  WEAVE_STROKE_SINGLE_NODE_TYPE,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveStrokeSingleNodeParams,
  WeaveStrokeSingleNodeTipSide,
  WeaveStrokeSingleProperties,
} from './types';
import { mergeExceptArrays } from '@/utils';
import { GreedySnapper } from '@/utils/greedy-snapper';
import type { WeaveBaseLineTipManager } from './base.line-tip-manager';
import { WeaveArrowLineTipManager } from './line-tip-managers/arrow.line-tip-manager';
import { WeaveCircleLineTipManager } from './line-tip-managers/circle.line-tip-manager';
import { WeaveNoneLineTipManager } from './line-tip-managers/none.line-tip-manager';
import { WeaveSquareLineTipManager } from './line-tip-managers/square.line-tip-manager';

export class WeaveStrokeSingleNode extends WeaveNode {
  private config: WeaveStrokeSingleProperties;
  protected snapper: GreedySnapper;
  protected startHandle: Konva.Circle | null = null;
  protected endHandle: Konva.Circle | null = null;
  protected handleNodeChanges: ((nodes: WeaveSelection[]) => void) | null;
  protected handleZoomChanges: (() => void) | null;
  protected nodeType: string = WEAVE_STROKE_SINGLE_NODE_TYPE;
  protected tipManagers: Record<string, WeaveBaseLineTipManager> = {
    [WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.ARROW]: new WeaveArrowLineTipManager(),
    [WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.CIRCLE]: new WeaveCircleLineTipManager(),
    [WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.SQUARE]: new WeaveSquareLineTipManager(),
    [WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE]: new WeaveNoneLineTipManager(),
  };

  constructor(params?: WeaveStrokeSingleNodeParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_STROKE_SINGLE_NODE_DEFAULT_CONFIG,
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
    const stroke = new Konva.Group({
      ...props,
      name: `node ${WEAVE_STROKE_SINGLE_NODE_TYPE}`,
      linePoints: props.linePoints,
      strokeScaleEnabled: true,
      overridesMouseControl: true,
    });

    const internalLine = new Konva.Line({
      ...props,
      id: `${stroke.getAttrs().id}-line`,
      nodeId: stroke.getAttrs().id,
      name: undefined,
      x: 0,
      y: 0,
      strokeScaleEnabled: true,
      lineJoin: 'miter',
      lineCap: 'round',
    });

    stroke.add(internalLine);

    this.setupDefaultNodeAugmentation(stroke);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    stroke.getTransformerProperties = function () {
      const points = this.getAttrs().linePoints as number[];

      return {
        ...defaultTransformerProperties,
        ignoreStroke: true,
        rotateEnabled: points.length !== 4,
        keepRatio: points.length !== 4,
        flipEnabled: points.length === 4,
        shiftBehavior: points.length === 4 ? 'none' : 'default',
        shouldOverdrawWholeArea: points.length !== 4,
      };
    };

    let originalStartHandleVisibility: boolean | null = null;
    let originalEndHandleVisibility: boolean | null = null;

    stroke.on('dragstart', () => {
      originalStartHandleVisibility = this.startHandle?.visible() ?? false;
      originalEndHandleVisibility = this.endHandle?.visible() ?? false;
      this.startHandle?.visible(false);
      this.endHandle?.visible(false);
    });

    stroke.on('dragend', () => {
      this.startHandle?.visible(originalStartHandleVisibility);
      this.endHandle?.visible(originalEndHandleVisibility);
      originalStartHandleVisibility = null;
      originalEndHandleVisibility = null;
    });

    this.setupDefaultNodeEvents(stroke);

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
        this.teardownSelection();

        if (
          nodes.length === 1 &&
          nodes[0].instance.getAttrs().nodeType ===
            WEAVE_STROKE_SINGLE_NODE_TYPE
        ) {
          const strokeSelected = this.instance
            .getStage()
            .findOne(`#${nodes[0].instance.getAttrs().id}`) as Konva.Group;

          if (!strokeSelected) {
            return;
          }

          this.setupHandles();
          this.showHandles(strokeSelected);

          this.setupSelection(strokeSelected, true);
        } else {
          this.startHandle?.setAttr('strokeId', undefined);
          this.startHandle?.visible(false);
          this.endHandle?.setAttr('strokeId', undefined);
          this.endHandle?.visible(false);
        }
      };

      this.instance.addEventListener('onNodesChange', this.handleNodeChanges);
    }

    const tipStartStyle = stroke.getAttrs().tipStartStyle ?? 'none';
    const tipEndStyle = stroke.getAttrs().tipEndStyle ?? 'none';

    this.tipManagers[tipStartStyle]?.render(
      stroke,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
    );
    this.tipManagers[tipEndStyle]?.render(
      stroke,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
    );

    stroke.handleMouseover = () => {
      this.setupSelection(stroke);
    };

    stroke.handleMouseout = () => {
      const attrs = stroke.getAttrs();

      if (attrs.isSelected) {
        return;
      }
      const nodes = stroke.find('.hoverClone');
      nodes.forEach((node) => node.destroy());
    };

    stroke.getTransformerProperties = () => {
      return this.defaultGetTransformerProperties({
        ...this.config.transform,
        rotateEnabled: false,
        shouldOverdrawWholeArea: false,
        borderStroke: 'transparent',
      });
    };

    stroke.allowedAnchors = function () {
      return [];
    };

    stroke.canBeHovered = function () {
      return false;
    };

    stroke.getNodeAnchors = function () {
      return [];
    };

    return stroke;
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
        const tr = this.instance
          .getPlugin<WeaveNodesSelectionPlugin>('nodesSelection')
          ?.getTransformer();

        if (tr) {
          tr.hide();
        }

        const strokeId = e.target.getAttr('strokeId');

        const stroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!stroke) {
          return;
        }

        const points = stroke.getAttrs().linePoints as number[];

        if (points.length === 4) {
          stroke.setAttr('eventTarget', true);
        }

        this.instance.emitEvent('onDrag', e.target);
      });

      startHandle.on('dragmove', (e) => {
        const draggedTarget = e.target;
        const strokeId = draggedTarget.getAttr('strokeId');

        const draggedStroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!draggedStroke) {
          return;
        }

        const internalLine = draggedStroke.findOne(
          `#${draggedStroke.getAttrs().id}-line`
        ) as Konva.Line;

        if (!internalLine) {
          return;
        }

        const points = draggedStroke.getAttrs().linePoints as number[];
        if (points.length !== 4) {
          return;
        }

        this.teardownSelection();

        const newLinePoint = this.getLinePointFromHandle(draggedStroke, e);

        draggedStroke.setAttrs({
          linePoints: [newLinePoint.x, newLinePoint.y, points[2], points[3]],
        });

        this.positionHandle(
          draggedStroke,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipStartStyle = draggedStroke.getAttrs().tipStartStyle ?? 'none';
        this.tipManagers[tipStartStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipEndStyle = draggedStroke.getAttrs().tipEndStyle ?? 'none';
        this.tipManagers[tipEndStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        this.setupSelection(draggedStroke);
      });

      startHandle.on('dragend', (e) => {
        const tr = this.instance
          .getPlugin<WeaveNodesSelectionPlugin>('nodesSelection')
          ?.getTransformer();

        if (tr) {
          tr.show();
        }

        const draggedTarget = e.target;
        const strokeId = draggedTarget.getAttr('strokeId');

        const draggedStroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!draggedStroke) {
          return;
        }

        const internalLine = draggedStroke.findOne(
          `#${draggedStroke.getAttrs().id}-line`
        ) as Konva.Line;

        if (!internalLine) {
          return;
        }

        const points = draggedStroke.getAttrs().linePoints as number[];
        if (points.length !== 4) {
          return;
        }

        this.teardownSelection();

        const newLinePoint = this.getLinePointFromHandle(draggedStroke, e);

        draggedStroke.setAttrs({
          linePoints: [
            newLinePoint.x,
            newLinePoint.y,
            points[2] as number,
            points[3] as number,
          ],
        });

        this.positionHandle(
          draggedStroke,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipStartStyle = draggedStroke.getAttrs().tipStartStyle ?? 'none';
        this.tipManagers[tipStartStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipEndStyle = draggedStroke.getAttrs().tipEndStyle ?? 'none';
        this.tipManagers[tipEndStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        this.setupSelection(draggedStroke);

        this.instance.updateNode(this.serialize(draggedStroke));

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
        const tr = this.instance
          .getPlugin<WeaveNodesSelectionPlugin>('nodesSelection')
          ?.getTransformer();

        if (tr) {
          tr.hide();
        }

        const strokeId = e.target.getAttr('strokeId');

        const draggedStroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!draggedStroke) {
          return;
        }

        const points = draggedStroke.getAttrs().linePoints as number[];
        if (points.length !== 4) {
          return;
        }

        if (points.length === 4) {
          draggedStroke.setAttr('eventTarget', true);
        }

        this.instance.emitEvent('onDrag', e.target);
      });

      endHandle.on('dragmove', (e) => {
        const draggedTarget = e.target;
        const strokeId = draggedTarget.getAttr('strokeId');

        const draggedStroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!draggedStroke) {
          return;
        }

        const internalLine = draggedStroke.findOne(
          `#${draggedStroke.getAttrs().id}-line`
        ) as Konva.Line;

        if (!internalLine) {
          return;
        }

        const points = draggedStroke.getAttrs().linePoints as number[];
        if (points.length !== 4) {
          return;
        }

        this.teardownSelection();

        const newLinePoint = this.getLinePointFromHandle(draggedStroke, e);

        draggedStroke.setAttrs({
          linePoints: [
            points[0] as number,
            points[1] as number,
            newLinePoint.x,
            newLinePoint.y,
          ],
        });

        this.positionHandle(
          draggedStroke,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        const tipStartStyle = draggedStroke.getAttrs().tipStartStyle ?? 'none';
        this.tipManagers[tipStartStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipEndStyle = draggedStroke.getAttrs().tipEndStyle ?? 'none';
        this.tipManagers[tipEndStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        this.setupSelection(draggedStroke);
      });

      endHandle.on('dragend', (e) => {
        const tr = this.instance
          .getPlugin<WeaveNodesSelectionPlugin>('nodesSelection')
          ?.getTransformer();

        if (tr) {
          tr.show();
        }

        const draggedTarget = e.target;
        const strokeId = draggedTarget.getAttr('strokeId');

        const draggedStroke = this.instance
          .getStage()
          .findOne(`#${strokeId}`) as Konva.Group;

        if (!draggedStroke) {
          return;
        }

        const internalLine = draggedStroke.findOne(
          `#${draggedStroke.getAttrs().id}-line`
        ) as Konva.Line;

        if (!internalLine) {
          return;
        }

        const points = draggedStroke.getAttrs().linePoints as number[];
        if (points.length !== 4) {
          return;
        }

        this.teardownSelection();

        const newLinePoint = this.getLinePointFromHandle(draggedStroke, e);

        draggedStroke.setAttrs({
          linePoints: [
            points[0] as number,
            points[1] as number,
            newLinePoint.x,
            newLinePoint.y,
          ],
        });

        this.positionHandle(
          draggedStroke,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        const tipStartStyle = draggedStroke.getAttrs().tipStartStyle ?? 'none';
        this.tipManagers[tipStartStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
        );

        const tipEndStyle = draggedStroke.getAttrs().tipEndStyle ?? 'none';
        this.tipManagers[tipEndStyle]?.update(
          draggedStroke as Konva.Group,
          WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
        );

        this.setupSelection(draggedStroke);

        this.instance.updateNode(this.serialize(draggedStroke));

        this.instance.emitEvent('onDrag', null);
      });

      this.endHandle = endHandle;
      this.endHandle.visible(false);

      this.instance.getSelectionLayer()?.add(this.endHandle);
    }
  }

  private showHandles(stroke: Konva.Group): void {
    if (this.startHandle === null || this.endHandle === null) {
      return;
    }

    this.startHandle.setAttr('strokeId', stroke.getAttrs().id);
    this.startHandle.setAttr('targetNode', stroke.getAttrs().id);
    this.startHandle.visible(true);
    this.startHandle.moveToTop();
    this.positionHandle(stroke, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);

    this.endHandle.setAttr('strokeId', stroke.getAttrs().id);
    this.endHandle.setAttr('targetNode', stroke.getAttrs().id);
    this.endHandle.visible(true);
    this.endHandle.moveToTop();
    this.positionHandle(stroke, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const stroke = nodeInstance as Konva.Group;

    const tipStartStyle = nextProps.tipStartStyle ?? 'none';
    const tipEndStyle = nextProps.tipEndStyle ?? 'none';

    this.tipManagers[tipStartStyle]?.render(
      stroke,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
    );

    this.tipManagers[tipEndStyle]?.render(
      stroke,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
    );

    const internalLine = stroke.findOne(
      `#${stroke.getAttrs().id}-line`
    ) as Konva.Line;

    if (internalLine) {
      internalLine.setAttrs({
        name: undefined,
        dash: nextProps.dash,
        fill: nextProps.fill,
        stroke: nextProps.stroke,
        strokeWidth: nextProps.strokeWidth,
        lineJoin: 'miter',
        lineCap: 'round',
      });
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Line): void {
    const scale = node.scale();

    const oldPoints = node.getAttrs().linePoints;
    const newPoints = [];

    for (let i = 0; i < oldPoints.length; i += 2) {
      const x = oldPoints[i] * scale.x;
      const y = oldPoints[i + 1] * scale.y;
      newPoints.push(x, y);
    }

    node.setAttrs({
      linePoints: newPoints,
    });

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  private positionHandle(
    instance: Konva.Group,
    point: WeaveStrokeSingleNodeTipSide
  ): void {
    const stage = this.instance.getStage();

    const points = instance.getAttrs().linePoints as number[];

    const internalLine = instance.findOne(
      `#${instance.getAttrs().id}-line`
    ) as Konva.Line;

    if (!internalLine) {
      return;
    }

    if (point === 'start' && this.startHandle) {
      const stagePoint = internalLine
        .getAbsoluteTransform()
        .point({ x: points[0], y: points[1] });

      const localPoint = stage
        .getAbsoluteTransform()
        .copy()
        .invert()
        .point(stagePoint);

      this.startHandle.x(localPoint.x);
      this.startHandle.y(localPoint.y);
    }
    if (point === 'end' && this.endHandle) {
      const stagePoint = internalLine
        .getAbsoluteTransform()
        .point({ x: points[2], y: points[3] });

      const localPoint = stage
        .getAbsoluteTransform()
        .copy()
        .invert()
        .point(stagePoint);

      this.endHandle.x(localPoint.x);
      this.endHandle.y(localPoint.y);
    }
  }

  private getLinePointFromHandle(
    instance: Konva.Group,
    e: Konva.KonvaEventObject<DragEvent>
  ): Konva.Vector2d {
    const stage = this.instance.getStage();
    const stagePoint = stage.getAbsoluteTransform().point(e.target.position());
    const localPoint = instance
      .getAbsoluteTransform()
      .copy()
      .invert()
      .point(stagePoint);

    return localPoint;
  }

  private setupSelection(
    instance: Konva.Group,
    markSelected: boolean = false
  ): void {
    if (markSelected) {
      instance.setAttrs({
        isSelected: true,
      });
    }

    const hoverClone = instance.findOne<Konva.Line>('.hoverClone');

    if (hoverClone) {
      return;
    }

    const internalLine = instance.findOne(
      `#${instance.getAttrs().id}-line`
    ) as Konva.Line;

    if (!internalLine) {
      return;
    }

    const internalLineHover = internalLine.clone();
    internalLineHover.setAttrs({
      name: 'hoverClone',
      stroke: '#1a1aff',
      listening: false,
      draggable: false,
      strokeWidth: 1,
      points: instance.getAttrs().linePoints as number[],
      strokeScaleEnabled: false,
    });
    instance.add(internalLineHover);
    internalLineHover.moveToTop();
  }

  private teardownSelection() {
    const stage = this.instance.getStage();

    const arrows = stage.find(
      `.${WEAVE_STROKE_SINGLE_NODE_TYPE}`
    ) as Konva.Group[];

    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];

      arrow.setAttrs({
        isSelected: false,
      });

      const nodes = arrow.find('.hoverClone');
      if (nodes.length > 0) {
        nodes.forEach((node) => node.destroy());
      }
    }
  }

  updateLine(instance: Konva.Group) {
    const tipStartStyle = instance.getAttrs().tipStartStyle ?? 'none';
    this.tipManagers[tipStartStyle]?.update(
      instance as Konva.Group,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
    );

    const tipEndStyle = instance.getAttrs().tipEndStyle ?? 'none';
    this.tipManagers[tipEndStyle]?.update(
      instance as Konva.Group,
      WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END
    );
  }
}
