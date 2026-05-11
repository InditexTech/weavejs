// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type BoundingBox, type DeepPartial } from '@inditextech/weave-types';
import {
  GUIDE_DISTANCE_ORIGIN,
  GUIDE_KIND,
  GUIDE_ORIENTATION,
  MOVE_ORIENTATION,
} from './constants';
import type { Weave } from '@/weave';

export type MoveOrientationKeys = keyof typeof MOVE_ORIENTATION;
export type MoveOrientation = (typeof MOVE_ORIENTATION)[MoveOrientationKeys];

export type GuideKindKeys = keyof typeof GUIDE_KIND;
export type GuideKind = (typeof GUIDE_KIND)[GuideKindKeys];

export type DistanceOriginKeys = keyof typeof GUIDE_DISTANCE_ORIGIN;
export type DistanceOrigin = (typeof GUIDE_DISTANCE_ORIGIN)[DistanceOriginKeys];

export type GuideOrientationKeys = keyof typeof GUIDE_ORIENTATION;
export type GuideOrientation = (typeof GUIDE_ORIENTATION)[GuideOrientationKeys];

export type Guide = {
  orientation: GuideOrientation;
  value: number;
  renderValue?: number;
  kind: GuideKind;
  guideId: string;
  containerId: string;
  persist?: boolean;
} & (
  | {
      kind: 'static' | 'custom';
    }
  | {
      kind: 'equal-distance';
      distanceCombinationIndex: number;
      distanceOrigin: DistanceOrigin;
      distance: number;
    }
  | {
      kind: 'centered-horizontal' | 'centered-vertical';
      distance: number;
      center: {
        from: BoundingBoxWithId;
        center: BoundingBoxWithId;
        to: BoundingBoxWithId;
      };
    }
);

export type SnapPoint = {
  orientation: GuideOrientation;
  guideId: string;
  value: number;
  offset: number;
  kind: GuideKind;
};

export type SnapMatch = {
  orientation: GuideOrientation;
  guideId: string;
  containerId: string;
  guide: number;
  offset: number;
  diff: number;
} & (
  | {
      kind: 'static' | 'custom';
    }
  | {
      kind: 'equal-distance';
      distanceCombinationIndex: number;
      distanceOrigin: DistanceOrigin;
      distance: number;
    }
  | {
      kind: 'centered-horizontal' | 'centered-vertical';
      distance: number;
      center: {
        from: BoundingBoxWithId;
        center: BoundingBoxWithId;
        to: BoundingBoxWithId;
      };
    }
);

export type SnapResult = {
  vertical?: SnapMatch;
  horizontal?: SnapMatch;
};

export type SnapOptions = {
  tolerance: number;
};

export type VisibleWorldRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WeaveNodesSnappingPluginParams = {
  config?: DeepPartial<WeaveNodesSnappingPluginConfig>;
};

export type WeaveGetStaticGuidesFunction = (params: {
  instance: Weave;
  containerId: string;
}) => Guide[];

export type WeaveNodesSnappingPluginConfig = {
  snap: SnapOptions;
  persistence: SnappingManagerPersistenceConfig;
  movement: SnappingManagerMovementConfig;
  style: SnappingManagerStyle;
  targetDistanceStyle: GuideDistanceToTargetInfoStyle;
  getStaticGuides?: WeaveGetStaticGuidesFunction;
};

export type SnappingManagerKindStyle = {
  default: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dash?: number[];
  };
  selected: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dash?: number[];
  };
};

export type GuideKindOnlyCustomOrStatic = Exclude<
  GuideKind,
  'centered-horizontal' | 'centered-vertical' | 'equal-distance'
>;

export type SnappingManagerStyle = Record<
  GuideKindOnlyCustomOrStatic,
  SnappingManagerKindStyle
>;

export type SnappingManagerPersistenceConfig = {
  enabled: boolean;
};

export type SnappingManagerMovementConfig = {
  delta: number;
  shiftDelta: number;
};

export type WeaveNodesSnappingCustomGuidesConfig = {
  persistence: SnappingManagerPersistenceConfig;
  movement: SnappingManagerMovementConfig;
  style: SnappingManagerStyle;
  targetDistanceStyle: GuideDistanceToTargetInfoStyle;
  getStaticGuides?: (params: {
    instance: Weave;
    containerId: string;
  }) => Guide[];
};

export type GuideDistanceToTargetInfoParams = {
  config: GuideDistanceToTargetInfoConfig;
};

export type GuideDistanceToTargetInfoConfig = {
  style: GuideDistanceToTargetInfoStyle;
};

export type GuideDistanceToTargetInfoStyle = {
  target: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dash?: number[];
  };
  distance: {
    opacity: number;
    line: {
      stroke: string;
      strokeWidth: number;
      opacity: number;
      dash?: number[];
    };
    text: {
      fill: string;
      fontSize: number;
      fontFamily: string;
      opacity: number;
    };
    background: {
      fill: string;
      cornerRadius: number;
      stroke: string;
      strokeWidth: number;
      opacity: number;
    };
  };
};

export type DistanceInfoH = {
  from: { id: string; box: BoundingBox };
  to: { id: string; box: BoundingBox };
  midY: number;
  distance: number;
};

export type DistanceInfoV = {
  from: { id: string; box: BoundingBox };
  to: { id: string; box: BoundingBox };
  midX: number;
  distance: number;
};

export type BoundingBoxWithId = {
  id: string;
  box: BoundingBox;
};

export type HIntersection = {
  combination: BoundingBoxWithId[];
  targetIndex: number;
  distances: DistanceInfoH[];
  targetDistanceIndexes: number[];
};

export type VIntersection = {
  combination: BoundingBoxWithId[];
  targetIndex: number;
  distances: DistanceInfoV[];
  targetDistanceIndexes: number[];
};
