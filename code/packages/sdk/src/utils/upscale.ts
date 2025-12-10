// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Weave } from '@/weave';
import type Konva from 'konva';
import { merge } from 'lodash';

export const setupUpscaleStage = (instance: Weave, stage: Konva.Stage) => {
  const config = instance.getConfiguration();

  const doUpscale = config.performance?.upscale?.enabled ?? false;

  if (doUpscale) {
    const defaultOptions = {
      multiplier: 1,
      baseWidth: 1920,
      baseHeight: 1080,
    };

    const finalOptions = merge({}, defaultOptions, {
      ...(config.performance?.upscale ?? {}),
    });

    const realContainer = stage.container();

    const containerWidth = realContainer.offsetWidth;
    const containerHeight = realContainer.offsetHeight;
    const containerRatio = containerWidth / containerHeight;

    const multiplier = finalOptions.multiplier;
    let scaledContainerWidth = finalOptions.baseWidth * multiplier;
    let scaledContainerHeight = finalOptions.baseHeight * multiplier;

    if (containerWidth > containerHeight) {
      scaledContainerWidth = Math.round(scaledContainerHeight * containerRatio);
    } else {
      scaledContainerHeight = Math.round(scaledContainerWidth / containerRatio);
    }

    stage.width(scaledContainerWidth);
    stage.height(scaledContainerHeight);

    const scaleX = containerWidth / scaledContainerWidth;
    const scaleY = containerHeight / scaledContainerHeight;

    let scaleToCover = 1;
    if (scaleX > scaleY) {
      scaleToCover = scaleX;
    } else {
      scaleToCover = scaleY;
    }

    stage.setAttrs({ upscaleScale: scaleToCover });

    const innerElement = realContainer.getElementsByClassName(
      'konvajs-content'
    )[0] as HTMLElement;

    if (innerElement) {
      innerElement.style.transformOrigin = '0 0';
      innerElement.style.transform = `scale(${scaleToCover})`;
    }
  } else {
    stage.setAttrs({ upscaleScale: 1 });
  }
};
