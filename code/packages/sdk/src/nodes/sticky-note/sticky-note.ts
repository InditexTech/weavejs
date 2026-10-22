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
  MIN_STICKY_NOTE_SIZE,
  DEFAULT_STICKY_NOTE_COLOR,
  DEFAULT_DOG_EAR_SIZE,
  DEFAULT_STICKY_NOTE_TEXT,
  DEFAULT_STICKY_NOTE_FONT_SIZE,
  DEFAULT_STICKY_NOTE_FONT_FAMILY,
  DEFAULT_STICKY_NOTE_TEXT_COLOR,
  DEFAULT_STICKY_NOTE_LINE_HEIGHT,
} from './constants';
import type {
  StickyNoteAttributes,
  WeaveStickyNoteNodeParams,
  WeaveStickyNoteProperties,
} from './types';
import { mergeExceptArrays } from '@/utils/utils';

export class WeaveStickyNoteNode extends WeaveNode {
  private config: WeaveStickyNoteProperties;
  protected nodeType: string = WEAVE_STICKY_NOTE_NODE_TYPE;
  initialize = undefined;

  constructor(params?: WeaveStickyNoteNodeParams) {
    super();

    const { config } = params ?? {};
    this.config = {
      transform: {
        ...config?.transform,
      },
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
      h - fold, // Right edge above fold
      w - fold,
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
      w - fold,
      h, // Left of fold on bottom edge
      w,
      h - fold, // Top of fold on right edge
      w - fold,
      h - fold, // Fold peak pointing inward
    ];
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const id = props.id ?? 'sticky-note';
    const width = Math.max(
      props.width ?? DEFAULT_STICKY_NOTE_WIDTH,
      MIN_STICKY_NOTE_SIZE
    );
    const height = Math.max(
      props.height ?? DEFAULT_STICKY_NOTE_HEIGHT,
      MIN_STICKY_NOTE_SIZE
    );
    const noteColor = props.color ?? DEFAULT_STICKY_NOTE_COLOR;
    const dogEarSize = props.dogEarSize ?? DEFAULT_DOG_EAR_SIZE;
    const textContent = props.text ?? DEFAULT_STICKY_NOTE_TEXT;
    const fontSize = props.fontSize ?? DEFAULT_STICKY_NOTE_FONT_SIZE;
    const fontFamily = props.fontFamily ?? DEFAULT_STICKY_NOTE_FONT_FAMILY;
    const fontColor = props.fontColor ?? DEFAULT_STICKY_NOTE_TEXT_COLOR;
    const author = props.author;

    const stickyParams = { ...props };
    delete stickyParams.zIndex;

    const stickyGroup = new Konva.Group({
      ...stickyParams,
      id: `${id}`,
      width,
      height,
      name: 'node',
    });

    if (this.instance) {
      this.setupDefaultNodeAugmentation(stickyGroup);
    }

    // 1. Drop shadow behind the note
    const shadowRect = new Konva.Rect({
      id: `${id}-shadow`,
      groupId: id,
      nodeId: id,
      x: 2,
      y: 4,
      width: width - 4,
      height: height - 4,
      cornerRadius: 4,
      fill: 'rgba(0, 0, 0, 0.04)',
      shadowColor: 'rgba(15, 23, 42, 0.16)',
      shadowBlur: 14,
      shadowOffset: { x: 3, y: 7 },
      shadowOpacity: 0.8,
      listening: false,
      draggable: false,
    });
    stickyGroup.add(shadowRect);

    // 2. Main paper body
    const mainSheet = new Konva.Line({
      id: `${id}-main-sheet`,
      groupId: id,
      nodeId: id,
      points: this.getMainSheetPoints(width, height, dogEarSize),
      fill: noteColor,
      closed: true,
      stroke: 'rgba(0, 0, 0, 0.08)',
      strokeWidth: 1,
      listening: true,
      draggable: false,
    });
    stickyGroup.add(mainSheet);

    // 3. Faint adhesive top strip
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

    // 4. Dog-ear fold shadow
    const foldShadow = new Konva.Line({
      id: `${id}-fold-shadow`,
      groupId: id,
      nodeId: id,
      points: this.getDogEarFlapPoints(width, height, dogEarSize),
      fill: 'rgba(0, 0, 0, 0.08)',
      closed: true,
      listening: false,
      draggable: false,
    });
    stickyGroup.add(foldShadow);

    // 5. Dog-ear flap
    const foldFlap = new Konva.Line({
      id: `${id}-fold-flap`,
      groupId: id,
      nodeId: id,
      points: this.getDogEarFlapPoints(width, height, dogEarSize),
      fill: 'rgba(0, 0, 0, 0.06)',
      closed: true,
      stroke: 'rgba(0, 0, 0, 0.10)',
      strokeWidth: 1,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowBlur: 4,
      shadowOffset: { x: -2, y: 2 },
      listening: false,
      draggable: false,
    });
    stickyGroup.add(foldFlap);

    // 6. Note text
    const textPaddingX = 18;
    const textPaddingTop = 18;
    const authorMargin = author ? 22 : 0;
    const textAvailableWidth = Math.max(width - textPaddingX * 2, 20);
    const textAvailableHeight = Math.max(
      height - textPaddingTop - dogEarSize - authorMargin,
      20
    );

    const noteText = new Konva.Text({
      id: `${id}-text`,
      groupId: id,
      nodeId: id,
      x: textPaddingX,
      y: textPaddingTop,
      width: textAvailableWidth,
      height: textAvailableHeight,
      text: textContent,
      fontSize,
      fontFamily,
      lineHeight: DEFAULT_STICKY_NOTE_LINE_HEIGHT,
      fill: fontColor,
      wrap: 'word',
      ellipsis: true,
      listening: false,
      draggable: false,
    });
    stickyGroup.add(noteText);

    // 7. Author badge pill
    if (author) {
      const authorText = new Konva.Text({
        id: `${id}-author`,
        groupId: id,
        nodeId: id,
        x: textPaddingX,
        y: height - 24,
        text: `@${author.toUpperCase()}`,
        fontSize: 10,
        fontFamily,
        fontStyle: 'bold',
        fill: 'rgba(31, 41, 55, 0.45)',
        listening: false,
        draggable: false,
      });
      stickyGroup.add(authorText);
    }

    stickyGroup.getTransformerProperties = () => {
      const baseConfig = this.instance
        ? this.defaultGetTransformerProperties({})
        : {};
      return {
        ...baseConfig,
        resizeEnabled: true,
        rotateEnabled: true,
        borderStrokeWidth: 1.5,
        borderStroke: '#2563EB',
        enabledAnchors: [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
          'top-center',
          'bottom-center',
          'middle-left',
          'middle-right',
        ],
        ...this.config?.transform,
      };
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    stickyGroup.allowedAnchors = () => [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
      'top-center',
      'bottom-center',
      'middle-left',
      'middle-right',
    ];

    if (this.instance) {
      this.setupDefaultNodeEvents(stickyGroup);
    }

    return stickyGroup;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: StickyNoteAttributes
  ): void {
    const {
      id,
      text,
      color,
      fontSize,
      fontFamily,
      fontColor,
      dogEarSize,
      author,
    } = nextProps;
    const stickyGroup = nodeInstance as Konva.Group;

    const width = Math.max(
      nextProps.width ?? stickyGroup.width(),
      MIN_STICKY_NOTE_SIZE
    );
    const height = Math.max(
      nextProps.height ?? stickyGroup.height(),
      MIN_STICKY_NOTE_SIZE
    );
    const foldSize = dogEarSize ?? DEFAULT_DOG_EAR_SIZE;
    const noteColor = color ?? DEFAULT_STICKY_NOTE_COLOR;

    const currentZIndex = nodeInstance.zIndex();
    nodeInstance.setAttrs({
      ...nextProps,
      width,
      height,
      zIndex: currentZIndex,
    });

    // 1. Update shadow geometry
    const shadowRect = stickyGroup.findOne(`#${id}-shadow`);
    if (shadowRect) {
      shadowRect.setAttrs({
        width: width - 4,
        height: height - 4,
      });
    }

    // 2. Update main sheet points & fill
    const mainSheet = stickyGroup.findOne(`#${id}-main-sheet`) as Konva.Line;
    if (mainSheet) {
      mainSheet.setAttrs({
        points: this.getMainSheetPoints(width, height, foldSize),
        fill: noteColor,
      });
    }

    // 3. Update adhesive strip width
    const adhesiveStrip = stickyGroup.findOne(`#${id}-adhesive-strip`);
    if (adhesiveStrip) {
      adhesiveStrip.setAttrs({
        width,
      });
    }

    // 4. Update dog-ear fold flap points
    const foldPoints = this.getDogEarFlapPoints(width, height, foldSize);
    const foldShadow = stickyGroup.findOne(`#${id}-fold-shadow`) as Konva.Line;
    if (foldShadow) {
      foldShadow.setAttrs({ points: foldPoints });
    }
    const foldFlap = stickyGroup.findOne(`#${id}-fold-flap`) as Konva.Line;
    if (foldFlap) {
      foldFlap.setAttrs({ points: foldPoints });
    }

    // 5. Update note text
    const textPaddingX = 18;
    const textPaddingTop = 18;
    const authorMargin = author ? 22 : 0;
    const textAvailableWidth = Math.max(width - textPaddingX * 2, 20);
    const textAvailableHeight = Math.max(
      height - textPaddingTop - foldSize - authorMargin,
      20
    );

    const noteText = stickyGroup.findOne(`#${id}-text`) as Konva.Text;
    if (noteText) {
      noteText.setAttrs({
        width: textAvailableWidth,
        height: textAvailableHeight,
        text: text ?? noteText.text(),
        fontSize: fontSize ?? noteText.fontSize(),
        fontFamily: fontFamily ?? noteText.fontFamily(),
        fill: fontColor ?? noteText.fill(),
      });
    }

    // 6. Update author text
    const authorText = stickyGroup.findOne(`#${id}-author`) as Konva.Text;
    if (authorText) {
      authorText.setAttrs({
        y: height - 24,
        text: author ? `@${author.toUpperCase()}` : '',
      });
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
        text: DEFAULT_STICKY_NOTE_TEXT,
        fontSize: DEFAULT_STICKY_NOTE_FONT_SIZE,
        fontFamily: DEFAULT_STICKY_NOTE_FONT_FAMILY,
        fontColor: DEFAULT_STICKY_NOTE_TEXT_COLOR,
        rotation: 0,
        zIndex: 1,
        children: [],
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
        width: props.width ?? DEFAULT_STICKY_NOTE_WIDTH,
        height: props.height ?? DEFAULT_STICKY_NOTE_HEIGHT,
        rotation: props.rotation ?? 0,
        color: props.color ?? DEFAULT_STICKY_NOTE_COLOR,
        dogEarSize: props.dogEarSize ?? DEFAULT_DOG_EAR_SIZE,
        text: props.text ?? DEFAULT_STICKY_NOTE_TEXT,
        fontSize: props.fontSize ?? DEFAULT_STICKY_NOTE_FONT_SIZE,
        fontFamily: props.fontFamily ?? DEFAULT_STICKY_NOTE_FONT_FAMILY,
        fontColor: props.fontColor ?? DEFAULT_STICKY_NOTE_TEXT_COLOR,
        ...(props.author && { author: props.author }),
      },
    });
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(prevNodeState, {
      props: {
        ...(nextProps.x !== undefined && { x: nextProps.x }),
        ...(nextProps.y !== undefined && { y: nextProps.y }),
        ...(nextProps.width !== undefined && { width: nextProps.width }),
        ...(nextProps.height !== undefined && { height: nextProps.height }),
        ...(nextProps.rotation !== undefined && {
          rotation: nextProps.rotation,
        }),
        ...(nextProps.color !== undefined && { color: nextProps.color }),
        ...(nextProps.dogEarSize !== undefined && {
          dogEarSize: nextProps.dogEarSize,
        }),
        ...(nextProps.text !== undefined && { text: nextProps.text }),
        ...(nextProps.fontSize !== undefined && {
          fontSize: nextProps.fontSize,
        }),
        ...(nextProps.fontFamily !== undefined && {
          fontFamily: nextProps.fontFamily,
        }),
        ...(nextProps.fontColor !== undefined && {
          fontColor: nextProps.fontColor,
        }),
        ...(nextProps.author !== undefined && { author: nextProps.author }),
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    return baseSchema.extend({
      type: z
        .literal(WEAVE_STICKY_NOTE_NODE_TYPE)
        .describe(
          `Type of the node, for a sticky note it will always be "${WEAVE_STICKY_NOTE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_STICKY_NOTE_NODE_TYPE)
          .describe(
            `Type of the node, for a sticky note it will always be "${WEAVE_STICKY_NOTE_NODE_TYPE}"`
          ),
        width: z.number().describe('Width of the sticky note in pixels'),
        height: z.number().describe('Height of the sticky note in pixels'),
        color: z
          .string()
          .describe(
            'Background color of the sticky note paper in hex/css format'
          ),
        dogEarSize: z
          .number()
          .optional()
          .describe('Size in pixels of the dog-ear folded corner'),
        text: z.string().optional().describe('Text content of the sticky note'),
        fontSize: z.number().optional().describe('Font size in pixels'),
        fontFamily: z.string().optional().describe('Font family name'),
        fontColor: z.string().optional().describe('Text color'),
        author: z
          .string()
          .optional()
          .describe('Author or user handle associated with the note'),
      }),
    });
  }
}
