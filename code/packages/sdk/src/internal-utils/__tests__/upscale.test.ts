// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupUpscaleStage } from '../upscale';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer(
  width: number,
  height: number,
  withKonvaContent = false
): HTMLDivElement {
  const div = document.createElement('div');
  Object.defineProperty(div, 'offsetWidth', { get: () => width, configurable: true });
  Object.defineProperty(div, 'offsetHeight', { get: () => height, configurable: true });
  if (withKonvaContent) {
    const inner = document.createElement('div');
    inner.className = 'konvajs-content';
    div.appendChild(inner);
  }
  return div;
}

function makeStage(container: HTMLDivElement) {
  return {
    container: vi.fn(() => container),
    width: vi.fn(),
    height: vi.fn(),
    setAttrs: vi.fn(),
  };
}

function makeInstance(serverSide: boolean, config: object = {}) {
  return {
    isServerSide: vi.fn(() => serverSide),
    getConfiguration: vi.fn(() => config),
  };
}

// ---------------------------------------------------------------------------
// Suite 1: server-side guard
// ---------------------------------------------------------------------------

describe('setupUpscaleStage — server-side guard', () => {
  it('returns early without touching stage when isServerSide() is true', () => {
    const container = makeContainer(800, 600);
    const stage = makeStage(container);
    const instance = makeInstance(true);

    setupUpscaleStage(instance as never, stage as never);

    expect(stage.width).not.toHaveBeenCalled();
    expect(stage.height).not.toHaveBeenCalled();
    expect(stage.setAttrs).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: upscale disabled
// ---------------------------------------------------------------------------

describe('setupUpscaleStage — upscale disabled', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = makeContainer(1024, 768);
  });

  it('uses container dimensions when enabled = false', () => {
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: false } } });

    setupUpscaleStage(instance as never, stage as never);

    expect(stage.width).toHaveBeenCalledWith(1024);
    expect(stage.height).toHaveBeenCalledWith(768);
    expect(stage.setAttrs).toHaveBeenCalledWith({ upscaleScale: 1 });
  });

  it('uses container dimensions when performance config is absent', () => {
    const stage = makeStage(container);
    const instance = makeInstance(false, {});

    setupUpscaleStage(instance as never, stage as never);

    expect(stage.width).toHaveBeenCalledWith(1024);
    expect(stage.height).toHaveBeenCalledWith(768);
    expect(stage.setAttrs).toHaveBeenCalledWith({ upscaleScale: 1 });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: upscale enabled
// ---------------------------------------------------------------------------

describe('setupUpscaleStage — upscale enabled', () => {
  it('landscape container: scaledContainerWidth is recomputed from ratio', () => {
    // container 1600×900 → ratio = 16/9
    // default baseWidth=1920, baseHeight=1080, multiplier=1
    // containerWidth(1600) > containerHeight(900) → scaledContainerWidth = baseHeight * ratio = 1080 * (16/9) = 1920
    const container = makeContainer(1600, 900);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    setupUpscaleStage(instance as never, stage as never);

    expect(stage.width).toHaveBeenCalledWith(1920);
    expect(stage.height).toHaveBeenCalledWith(1080);
  });

  it('portrait container: scaledContainerHeight is recomputed from ratio', () => {
    // container 900×1600 → ratio = 9/16
    // containerWidth(900) <= containerHeight(1600) → scaledContainerHeight = baseWidth / ratio = 1920 / (9/16) = 3413
    const container = makeContainer(900, 1600);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    setupUpscaleStage(instance as never, stage as never);

    const widthCall = (stage.width as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    const heightCall = (stage.height as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    // scaledContainerWidth = 1920 (baseWidth, unchanged)
    expect(widthCall).toBe(1920);
    // scaledContainerHeight = round(1920 / (900/1600)) = round(1920 * 16/9) = 3413
    expect(heightCall).toBe(Math.round(1920 / (900 / 1600)));
  });

  it('scaleX > scaleY: scaleToCover = scaleX, setAttrs uses scaleX', () => {
    // container 800×600, landscape → scaledW = round(1080 * 800/600) = 1440, scaledH = 1080
    // scaleX = 800/1440 ≈ 0.556, scaleY = 600/1080 ≈ 0.556 → scaleX = scaleY in this case
    // Use a container where scaleX > scaleY:
    // container 200×100 → ratio = 2, landscape
    // scaledW = round(1080*2) = 2160, scaledH = 1080
    // scaleX = 200/2160 ≈ 0.0926, scaleY = 100/1080 ≈ 0.0926
    // Actually need an asymmetric case — use custom baseWidth/baseHeight
    // container 200×100, baseW=1000, baseH=200 → landscape
    // scaledW = round(200 * (200/100)) = 400, scaledH = 200
    // scaleX = 200/400 = 0.5, scaleY = 100/200 = 0.5 — still equal
    // Use container 300×100 ratio=3, baseW=100, baseH=100 → landscape
    // scaledW = round(100*3) = 300, scaledH = 100
    // scaleX = 300/300 = 1, scaleY = 100/100 = 1 — equal again
    // For scaleX > scaleY: container 100×400, baseW=200, baseH=1000 → portrait (w<=h)
    // scaledH = round(200 / (100/400)) = round(200*4) = 800, scaledW = 200
    // scaleX = 100/200 = 0.5, scaleY = 400/800 = 0.5 — still equal
    // Container 150×400, ratio=3/8, portrait
    // scaledH = round(200 / (150/400)) = round(200 * 400/150) = round(533.3) = 533
    // scaleX = 150/200 = 0.75, scaleY = 400/533 ≈ 0.75 — still approx equal
    // Actually for scaleX > scaleY we need asymmetry. Use:
    // container 800×600, portrait NOT applicable (800>600)
    // landscape: container 1000×600, baseW=4000, baseH=3000 → multiplier=1
    // scaledW = round(3000 * (1000/600)) = round(5000) = 5000, scaledH = 3000
    // scaleX = 1000/5000 = 0.2, scaleY = 600/3000 = 0.2 — equal
    // Asymmetric: container 1000×600, baseW=2000, baseH=3000 → landscape (1000>600)
    // scaledW = round(3000 * (1000/600)) = round(5000) = 5000, scaledH = 3000
    // scaleX = 1000/5000 = 0.2, scaleY = 600/3000 = 0.2 — still equal because ratio is maintained
    // The scaleX > scaleY case occurs when the container ratio != base ratio
    // container 1000×500, baseW=1920, baseH=1080 → landscape (1000>500)
    // scaledW = round(1080 * (1000/500)) = round(2160) = 2160, scaledH = 1080
    // scaleX = 1000/2160 ≈ 0.463, scaleY = 500/1080 ≈ 0.463 — still equal
    // The ratio is always maintained by the calculation, so scaleX always = scaleY?
    // Let's think differently: use portrait path (width <= height)
    // container 500×1000, baseW=1920, baseH=1080 → portrait (500 <= 1000)
    // scaledH = round(1920 / (500/1000)) = round(1920 * 2) = 3840, scaledW = 1920
    // scaleX = 500/1920 ≈ 0.260, scaleY = 1000/3840 ≈ 0.260 — equal again!
    // The math shows scaleX always = scaleY because scale is derived from ratio.
    // To break this, use an odd multiplier that causes rounding:
    // container 1001×500 (slightly wider), landscape, default options
    // scaledW = round(1080 * (1001/500)) = round(1080 * 2.002) = round(2162.16) = 2162
    // scaledH = 1080
    // scaleX = 1001/2162 ≈ 0.4630, scaleY = 500/1080 ≈ 0.4630 — still very close
    // scaleX > scaleY when: (containerW / scaledW) > (containerH / scaledH)
    // With rounding: 1001/2162 vs 500/1080 → 1001*1080 vs 500*2162 → 1081080 vs 1081000 → scaleX > scaleY ✓
    const container = makeContainer(1001, 500);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    setupUpscaleStage(instance as never, stage as never);

    const scaledW = Math.round(1080 * (1001 / 500));
    const scaledH = 1080;
    const expectedScaleX = 1001 / scaledW;
    const expectedScaleY = 500 / scaledH;
    expect(expectedScaleX).toBeGreaterThan(expectedScaleY);
    expect(stage.setAttrs).toHaveBeenCalledWith({ upscaleScale: expectedScaleX });
  });

  it('scaleY > scaleX: scaleToCover = scaleY, setAttrs uses scaleY', () => {
    // container 500×1004 portrait (500 <= 1004)
    // scaledH = round(1920 / (500/1004)) = round(1920 * 1004/500) = 3855 (rounds down)
    // scaleX = 500/1920, scaleY = 1004/3855 → scaleY > scaleX ✓
    const container = makeContainer(500, 1004);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    setupUpscaleStage(instance as never, stage as never);

    const scaledW = 1920;
    const scaledH = Math.round(1920 / (500 / 1004));
    const expectedScaleX = 500 / scaledW;
    const expectedScaleY = 1004 / scaledH;
    expect(expectedScaleY).toBeGreaterThan(expectedScaleX);
    expect(stage.setAttrs).toHaveBeenCalledWith({ upscaleScale: expectedScaleY });
  });

  it('sets transformOrigin and transform on konvajs-content element when present', () => {
    const container = makeContainer(1001, 500, true);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    setupUpscaleStage(instance as never, stage as never);

    const inner = container.getElementsByClassName('konvajs-content')[0] as HTMLElement;
    expect(inner.style.transformOrigin).toBe('0 0');
    expect(inner.style.transform).toMatch(/^scale\(/);
  });

  it('does not crash when konvajs-content element is absent', () => {
    const container = makeContainer(1001, 500, false);
    const stage = makeStage(container);
    const instance = makeInstance(false, { performance: { upscale: { enabled: true } } });

    expect(() => setupUpscaleStage(instance as never, stage as never)).not.toThrow();
    expect(stage.setAttrs).toHaveBeenCalled();
  });

  it('respects custom multiplier, baseWidth, and baseHeight from config', () => {
    // container 800×600 → landscape (800>600), ratio = 4/3
    // custom: baseWidth=3840, baseHeight=2160, multiplier=2
    // defaults merged → finalOptions = { multiplier:2, baseWidth:3840, baseHeight:2160 }
    // scaledW = round(2160*2 * (800/600)) = round(4320 * 4/3) = round(5760) = 5760
    // scaledH = 2160*2 = 4320
    const container = makeContainer(800, 600);
    const stage = makeStage(container);
    const instance = makeInstance(false, {
      performance: {
        upscale: { enabled: true, multiplier: 2, baseWidth: 3840, baseHeight: 2160 },
      },
    });

    setupUpscaleStage(instance as never, stage as never);

    const scaledH = 2160 * 2;
    const scaledW = Math.round(scaledH * (800 / 600));
    expect(stage.width).toHaveBeenCalledWith(scaledW);
    expect(stage.height).toHaveBeenCalledWith(scaledH);
  });
});
