// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  WEAVE_STICKY_NOTE_NODE_TYPE,
  DEFAULT_STICKY_NOTE_WIDTH,
  DEFAULT_STICKY_NOTE_HEIGHT,
  DEFAULT_STICKY_NOTE_COLOR,
  DEFAULT_DOG_EAR_SIZE,
} from './constants';
import type {
  WeaveStickyNoteNodeParams,
  WeaveStickyNoteProperties,
} from './types';
import { mergeExceptArrays } from '@/utils/utils';
import { commitShapeLabel } from '@/nodes/shared/shape-label.edit-shared';
import { createShapeLabelEngine } from '@/nodes/shared/shape-label.engine';
import type {
  WeaveShapeLabelEngine,
  WeaveShapeLabelTextBounds,
} from '@/nodes/shared/shape-label.types';
import {
  labelId,
  WEAVE_SHAPE_LABEL_DEFAULTS,
} from '@/nodes/shared/shape-label.constants';
import {
  computeStickyNoteLabelMinSize,
  spreadLabelProps,
  getShapeLabelSchemaFields,
  applyLabelBlocksState,
} from '@/nodes/shared/shape-label.utils';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

export class WeaveStickyNoteNode extends WeaveNode {
  private config: WeaveStickyNoteProperties;
  protected nodeType: string = WEAVE_STICKY_NOTE_NODE_TYPE;
  initialize = undefined;
  private _shapeLabelEditor: WeaveShapeLabelEngine | undefined;
  private _transforming = false;

  private get shapeLabelEditor(): WeaveShapeLabelEngine {
    return (this._shapeLabelEditor ??= createShapeLabelEngine(
      this.instance,
      this.config.label
    ));
  }

  constructor(params?: WeaveStickyNoteNodeParams) {
    super();

    const { config } = params ?? {};
    this.config = {
      transform: {
        ...config?.transform,
      },
      label: { ...config?.label },
    };
  }

  /**
   * Generates a 5-point polygon outline for the main paper sheet,
   * cutting off the bottom-right corner where the dog-ear fold sits.
   */
  private getMainSheetPoints(w: number, h: number, fold: number): number[] {
    return [
      0,
      0, // Top-left
      w,
      0, // Top-right
      w,
      Math.max(0, h - fold), // Right edge above fold
      Math.max(0, w - fold),
      h, // Bottom edge left of fold
      0,
      h, // Bottom-left
    ];
  }

  /**
   * Generates a 3-point triangle polygon for the turned dog-ear fold flap.
   */
  private getDogEarFlapPoints(w: number, h: number, fold: number): number[] {
    return [
      Math.max(0, w - fold),
      h, // Left of fold on bottom edge
      w,
      Math.max(0, h - fold), // Top of fold on right edge
      Math.max(0, w - fold),
      Math.max(0, h - fold), // Fold peak pointing inward
    ];
  }

  /**
   * Shared layout helper computing text bounds, fold geometry, and margins
   * consistently for both onRender and onUpdate.
   */
  private getLayout(props: WeaveElementAttributes) {
    const width = Math.max(props.width ?? DEFAULT_STICKY_NOTE_WIDTH, 1);
    const height = Math.max(props.height ?? DEFAULT_STICKY_NOTE_HEIGHT, 1);
    const dogEarSize = props.dogEarSize ?? DEFAULT_DOG_EAR_SIZE;
    const author = props.author;
    const authorMargin = author ? 22 : 0;
    const padX =
      props.labelPaddingX ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingX;
    const padY =
      props.labelPaddingY ?? WEAVE_SHAPE_LABEL_DEFAULTS.labelPaddingY;

    const textBounds: WeaveShapeLabelTextBounds = {
      x: padX,
      y: padY,
      width: Math.max(1, width - padX * 2),
      height: Math.max(1, height - padY * 2 - dogEarSize - authorMargin),
    };

    const mainSheetPoints = this.getMainSheetPoints(width, height, dogEarSize);
    const flapPoints = this.getDogEarFlapPoints(width, height, dogEarSize);

    return {
      width,
      height,
      dogEarSize,
      author,
      authorMargin,
      padX,
      padY,
      textBounds,
      mainSheetPoints,
      flapPoints,
    };
  }

  /**
   * Synchronizes internal canvas shapes to current dimensions and colors.
   */
  private updateInternalShapes(
    stickyGroup: Konva.Group,
    props: WeaveElementAttributes
  ) {
    const { width, height, author, padX, mainSheetPoints, flapPoints } =
      this.getLayout(props);
    const noteColor = props.color ?? DEFAULT_STICKY_NOTE_COLOR;

    const mainSheet = stickyGroup.findOne<Konva.Line>(
      `#${props.id}-main-sheet`
    );
    if (mainSheet) {
      mainSheet.setAttrs({
        points: mainSheetPoints,
        fill: noteColor,
      });
      mainSheet.moveToBottom();
    }

    const adhesiveStrip = stickyGroup.findOne<Konva.Rect>(
      `#${props.id}-adhesive-strip`
    );
    if (adhesiveStrip) {
      adhesiveStrip.setAttrs({
        width,
      });
    }

    const foldShadow = stickyGroup.findOne<Konva.Line>(
      `#${props.id}-fold-shadow`
    );
    if (foldShadow) {
      foldShadow.setAttrs({
        points: flapPoints,
      });
    }

    const foldFlap = stickyGroup.findOne<Konva.Line>(`#${props.id}-fold-flap`);
    if (foldFlap) {
      foldFlap.setAttrs({
        points: flapPoints,
      });
    }

    const authorText = stickyGroup.findOne<Konva.Text>(`#${props.id}-author`);
    if (author) {
      if (authorText) {
        authorText.setAttrs({
          x: padX,
          y: height - 20,
          text: author,
        });
      } else {
        stickyGroup.add(
          new Konva.Text({
            id: `${props.id}-author`,
            groupId: props.id,
            nodeId: props.id,
            x: padX,
            y: height - 20,
            text: author,
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            fill: 'rgba(31, 41, 55, 0.5)',
            listening: false,
            draggable: false,
          })
        );
      }
    } else if (authorText) {
      authorText.destroy();
    }
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const id = props.id ?? 'sticky-note';
    const {
      width,
      height,
      author,
      padX,
      textBounds,
      mainSheetPoints,
      flapPoints,
    } = this.getLayout(props);
    const noteColor = props.color ?? DEFAULT_STICKY_NOTE_COLOR;

    const stickyParams = { ...props };
    delete stickyParams.zIndex;

    const stickyGroup = new Konva.Group({
      ...stickyParams,
      id: `${id}`,
      width,
      height,
      name: 'node',
    });

    // 1. Main paper body with realistic physical drop shadow directly on shape
    const mainSheet = new Konva.Line({
      id: `${id}-main-sheet`,
      groupId: id,
      nodeId: id,
      points: mainSheetPoints,
      fill: noteColor,
      closed: true,
      stroke: 'rgba(0, 0, 0, 0.08)',
      strokeWidth: 1,
      shadowColor: 'rgba(15, 23, 42, 0.16)',
      shadowBlur: 10,
      shadowOffset: { x: 2, y: 5 },
      shadowOpacity: 0.7,
      listening: true,
      draggable: false,
    });
    stickyGroup.add(mainSheet);

    // 2. Faint adhesive top strip
    const adhesiveStrip = new Konva.Rect({
      id: `${id}-adhesive-strip`,
      groupId: id,
      nodeId: id,
      x: 0,
      y: 0,
      width,
      height: 6,
      fill: 'rgba(255, 255, 255, 0.35)',
      listening: false,
      draggable: false,
    });
    stickyGroup.add(adhesiveStrip);

    // 3. Dog-ear fold shadow beneath flap
    const foldShadow = new Konva.Line({
      id: `${id}-fold-shadow`,
      groupId: id,
      nodeId: id,
      points: flapPoints,
      fill: 'rgba(0, 0, 0, 0.08)',
      closed: true,
      listening: false,
      draggable: false,
    });
    stickyGroup.add(foldShadow);

    // 4. Dog-ear flap (listening: true so clicking the corner flap selects the note)
    const foldFlap = new Konva.Line({
      id: `${id}-fold-flap`,
      groupId: id,
      nodeId: id,
      points: flapPoints,
      fill: 'rgba(0, 0, 0, 0.06)',
      closed: true,
      stroke: 'rgba(0, 0, 0, 0.10)',
      strokeWidth: 1,
      listening: true,
      draggable: false,
    });
    stickyGroup.add(foldFlap);

    // 5. Unified Shape Label Engine text
    this.shapeLabelEditor.renderLabel(stickyGroup, props, textBounds);

    // 6. Optional author text stored as-is without forced formatting
    if (author) {
      const authorText = new Konva.Text({
        id: `${id}-author`,
        groupId: id,
        nodeId: id,
        x: padX,
        y: height - 20,
        text: author,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: 'rgba(31, 41, 55, 0.5)',
        listening: false,
        draggable: false,
      });
      stickyGroup.add(authorText);
    }

    foldFlap.moveToTop();
    mainSheet.moveToBottom();

    this.setupDefaultNodeAugmentation(stickyGroup);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    stickyGroup.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(stickyGroup);

    // Live resize: scaleReset on every transform event and re-render without distortion
    stickyGroup.on('transformstart', () => {
      this._transforming = true;
    });

    stickyGroup.on('transform', () => {
      this.scaleReset(stickyGroup);
      this.onUpdate(stickyGroup, stickyGroup.getAttrs());
    });

    stickyGroup.on('transformend', () => {
      this._transforming = false;
    });

    // Double-click to enter inline label edit mode
    stickyGroup.dblClick = () => {
      if (this.shapeLabelEditor.isEditing()) {
        return;
      }

      if (!(this.isSelecting() && this.isNodeSelected(stickyGroup))) {
        return;
      }

      const onCommit = (
        labelText: string,
        labelBlocks?: WeaveElementAttributes['labelBlocks']
      ) =>
        commitShapeLabel(
          this.instance,
          (g) => this.serialize(g),
          `${props.id}`,
          labelText,
          labelBlocks
        );

      const currentAttrs = stickyGroup.getAttrs() as WeaveElementAttributes;
      const {
        textBounds: curBounds,
        dogEarSize,
        authorMargin,
      } = this.getLayout(currentAttrs);
      const originalHeight =
        (currentAttrs.height as number) ?? DEFAULT_STICKY_NOTE_HEIGHT;

      this.shapeLabelEditor.triggerEditMode(
        stickyGroup,
        curBounds,
        onCommit,
        (neededShapeHeight) => {
          // Never shrink below original; include fold and author margin
          const finalHeight = Math.max(
            neededShapeHeight + dogEarSize + authorMargin,
            originalHeight
          );
          stickyGroup.setAttrs({ height: finalHeight });
          this.updateInternalShapes(stickyGroup, {
            ...currentAttrs,
            height: finalHeight,
          });
          stickyGroup.getLayer()?.batchDraw();
        }
      );
    };

    stickyGroup.getNodeMinSize = () => {
      return computeStickyNoteLabelMinSize(
        this.instance.getStage(),
        stickyGroup
      );
    };

    return stickyGroup;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const stickyGroup = nodeInstance as Konva.Group;
    this.updateInternalShapes(stickyGroup, nextProps);

    const { textBounds, dogEarSize, authorMargin } = this.getLayout(nextProps);

    this.shapeLabelEditor.updateLabel(
      stickyGroup,
      nextProps,
      textBounds,
      (neededShapeHeight) => {
        const finalHeight = neededShapeHeight + dogEarSize + authorMargin;
        nodeInstance.setAttrs({ height: finalHeight });
        this.updateInternalShapes(stickyGroup, {
          ...nextProps,
          height: finalHeight,
        });

        // Persist grown height to Yjs only when not actively transforming
        if (!this._transforming) {
          this.instance.updateNode(this.serialize(stickyGroup));
        }
      }
    );

    // Keep label above sheet and fold on top
    const labelNode = stickyGroup.findOne(`#${labelId(nextProps.id ?? '')}`);
    if (labelNode) {
      labelNode.moveToTop();
      const foldFlap = stickyGroup.findOne(`#${nextProps.id}-fold-flap`);
      foldFlap?.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_STICKY_NOTE_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_STICKY_NOTE_NODE_TYPE,
        x: 0,
        y: 0,
        width: DEFAULT_STICKY_NOTE_WIDTH,
        height: DEFAULT_STICKY_NOTE_HEIGHT,
        color: DEFAULT_STICKY_NOTE_COLOR,
        dogEarSize: DEFAULT_DOG_EAR_SIZE,
        author: '',
        rotation: 0,
        zIndex: 1,
        children: [],
        ...WEAVE_SHAPE_LABEL_DEFAULTS,
      },
    };
  }

  static addNodeState(
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(defaultNodeState, {
      props: {
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
        rotation: props.rotation,
        color: props.color,
        dogEarSize: props.dogEarSize,
        ...(props.author !== undefined && { author: props.author }),
        ...spreadLabelProps(props),
      },
    });
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    const next = mergeExceptArrays(prevNodeState, {
      props: {
        x: nextProps.x,
        y: nextProps.y,
        width: nextProps.width,
        height: nextProps.height,
        rotation: nextProps.rotation,
        color: nextProps.color,
        dogEarSize: nextProps.dogEarSize,
        ...(nextProps.author !== undefined && { author: nextProps.author }),
        ...spreadLabelProps(nextProps),
      },
    });
    return applyLabelBlocksState(next, nextProps);
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_STICKY_NOTE_NODE_TYPE)
        .describe(
          `Type of the node, for a sticky note node it will always be "${WEAVE_STICKY_NOTE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_STICKY_NOTE_NODE_TYPE)
          .describe(
            `Type of the node, for a sticky note node it will always be "${WEAVE_STICKY_NOTE_NODE_TYPE}"`
          ),

        width: z.number().describe('Width of the sticky note in pixels'),
        height: z.number().describe('Height of the sticky note in pixels'),
        color: z
          .string()
          .optional()
          .describe('Background color of the sticky note in hex format'),
        dogEarSize: z
          .number()
          .optional()
          .describe('Size of the folded dog-ear corner in pixels'),
        author: z
          .string()
          .optional()
          .describe('Optional author name for the sticky note'),

        ...getShapeLabelSchemaFields(),
      }),
    });

    return nodeSchema;
  }
}
