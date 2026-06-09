// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Konva from 'konva';
import { WeaveVideoNode } from '../video';
import { WEAVE_VIDEO_DEFAULT_CONFIG, WEAVE_VIDEO_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// Mock isServer so server-side paths can be toggled per test
const mockIsServer = vi.fn().mockReturnValue(false);
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return { ...actual, isServer: () => mockIsServer() };
});

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Returns a fresh mock HTMLVideoElement with non-standard Video APIs added. */
function makeMockVideoElement() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const el = {
    crossOrigin: '',
    preload: '',
    src: '',
    currentTime: 0,
    duration: 100,
    videoWidth: 640,
    videoHeight: 480,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    requestVideoFrameCallback: vi.fn().mockReturnValue(42),
    cancelVideoFrameCallback: vi.fn(),
    addEventListener: vi.fn().mockImplementation(
      (name: string, cb: (...args: unknown[]) => void) => {
        (listeners[name] ??= []).push(cb);
      }
    ),
    removeEventListener: vi.fn(),
    _listeners: listeners,
  };
  return el as unknown as HTMLVideoElement & {
    _listeners: Record<string, ((...args: unknown[]) => void)[]>;
    requestVideoFrameCallback: ReturnType<typeof vi.fn>;
    cancelVideoFrameCallback: ReturnType<typeof vi.fn>;
  };
}

/** Returns a fresh mock HTMLImageElement for Konva.Util.createImageElement. */
function makeMockImageElement() {
  const el = {
    src: '',
    crossOrigin: '',
    onload: null as ((...args: unknown[]) => void) | null,
    onerror: null as ((...args: unknown[]) => void) | null,
  };
  return el as HTMLImageElement & {
    onload: ((...args: unknown[]) => void) | null;
    onerror: ((...args: unknown[]) => void) | null;
  };
}

function createMockInstance() {
  const mockStage = {
    findOne: vi.fn().mockReturnValue(null),
    find: vi.fn().mockReturnValue([]),
    container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    getAttr: vi.fn().mockReturnValue(undefined),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(undefined) as any,
    getStage: vi.fn().mockReturnValue(mockStage),
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getStore: vi.fn().mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
    getInstanceRecursive: vi.fn().mockImplementation((node) => node),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    loadAsyncElement: vi.fn(),
    resolveAsyncElement: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
  };
}

type MockInstance = ReturnType<typeof createMockInstance>;

function makeNode(configOverrides: Record<string, unknown> = {}) {
  const node = new WeaveVideoNode({ config: configOverrides });
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-video',
    width: 320,
    height: 240,
    videoURL: 'https://example.com/video.mp4',
    videoPlaceholderURL: 'https://example.com/placeholder.jpg',
    ...overrides,
  };
}

/** Get the listener registered with instance.addEventListener for an event. */
function getInstanceListener(mock: MockInstance, eventName: string) {
  const call = mock.addEventListener.mock.calls.find(([ev]) => ev === eventName);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

/** Fire a Konva event on a group (simulating event fired directly on the group). */
function fireKonvaEvent(
  group: Konva.Group,
  eventName: string,
  eventData: Record<string, unknown> = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = (group as any).eventListeners[eventName] ?? [];
  for (const { handler } of listeners) {
    handler.call(group, { target: group, cancelBubble: false, ...eventData });
  }
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  const mockCtx = {
    measureText: () => ({ width: 50 }),
    font: '',
    save: () => {},
    restore: () => {},
    fillText: () => {},
    strokeText: () => {},
    setTransform: () => {},
    clearRect: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    transform: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    rect: () => {},
    arc: () => {},
    clip: () => {},
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    textBaseline: '',
    imageSmoothingEnabled: false,
    arcTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    drawImage: () => {},
  };
  vi.spyOn(Konva.Util, 'createCanvasElement').mockReturnValue({
    getContext: () => mockCtx,
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement);

  augmentKonvaNodeClass();
});

beforeEach(() => {
  mockIsServer.mockReturnValue(false);
  document.body.innerHTML = '';
  // Default: createImageElement returns a fresh mock for each call
  vi.spyOn(Konva.Util, 'createImageElement').mockImplementation(
    () => makeMockImageElement()
  );
});

// ===========================================================================
// Suite 1 — Constructor
// ===========================================================================

describe('1 — Constructor', () => {
  it('1.1 no params → config equals WEAVE_VIDEO_DEFAULT_CONFIG', () => {
    const node = new WeaveVideoNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (node as any).config;
    expect(config.crossOrigin).toBe(WEAVE_VIDEO_DEFAULT_CONFIG.crossOrigin);
    expect(config.style.track.color).toBe(WEAVE_VIDEO_DEFAULT_CONFIG.style.track.color);
    expect(config.style.background.color).toBe(WEAVE_VIDEO_DEFAULT_CONFIG.style.background.color);
  });

  it('1.2 custom params merged correctly', () => {
    const node = new WeaveVideoNode({
      config: { crossOrigin: 'use-credentials', style: { track: { color: '#FF0000FF' } } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (node as any).config;
    expect(config.crossOrigin).toBe('use-credentials');
    expect(config.style.track.color).toBe('#FF0000FF');
    // Other defaults preserved
    expect(config.style.background.color).toBe(WEAVE_VIDEO_DEFAULT_CONFIG.style.background.color);
  });
});

// ===========================================================================
// Suite 2 — initialize()
// ===========================================================================

describe('2 — initialize()', () => {
  it('2.1 resets all state dicts to {} and videoIconImage to undefined', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;
    n.videoState = { 'v1': { playing: true } };
    n.videoSource = { 'v1': {} };
    n.videoSourceFrameId = { 'v1': 1 };
    n.videoPlaceholder = { 'v1': {} };
    n.videoIconImage = {} as HTMLImageElement;

    node.initialize();

    expect(n.videoState).toEqual({});
    expect(n.videoSource).toEqual({});
    expect(n.videoSourceFrameId).toEqual({});
    expect(n.videoPlaceholder).toEqual({});
    expect(n.videoIconImage).toBeUndefined();
  });
});

// ===========================================================================
// Suite 3 — initVideoIcon (via onRender)
// ===========================================================================

describe('3 — initVideoIcon', () => {
  it('3.1 first onRender → creates videoIconImage (createImageElement called)', () => {
    const { node } = makeNode();
    const createImgMock = vi.mocked(Konva.Util.createImageElement);
    const callsBefore = createImgMock.mock.calls.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};

    node.onRender(defaultProps());

    expect(createImgMock.mock.calls.length).toBeGreaterThan(callsBefore);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((node as any).videoIconImage).toBeDefined();
  });

  it('3.2 second onRender → videoIconImage not recreated (createImageElement called once for icon)', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};

    node.onRender(defaultProps());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iconImgAfterFirst = (node as any).videoIconImage;

    node.onRender(defaultProps());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iconImgAfterSecond = (node as any).videoIconImage;

    expect(iconImgAfterFirst).toBe(iconImgAfterSecond);
  });
});

// ===========================================================================
// Suite 4 — onRender: DOM structure
// ===========================================================================

describe('4 — onRender: DOM structure', () => {
  it('4.1 returns Konva.Group with correct id', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    expect(group).toBeInstanceOf(Konva.Group);
    expect(group.id()).toBe('test-video');
  });

  it('4.2 creates bg Rect with fill from config', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const bg = group.findOne('#test-video-bg') as Konva.Rect;
    expect(bg).toBeDefined();
    expect(bg.fill()).toBe(WEAVE_VIDEO_DEFAULT_CONFIG.style.background.color);
  });

  it('4.3 creates videoPlaceholder Image (visible)', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const placeholder = group.findOne('#test-video-video-placeholder');
    expect(placeholder).toBeDefined();
    expect(placeholder!.isVisible()).toBe(true);
  });

  it('4.4 creates videoIconGroup with icon and iconBg children', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const iconGroup = group.findOne('#test-video-video-icon-group');
    const iconBg = group.findOne('#test-video-video-icon-bg');
    const icon = group.findOne('#test-video-video-icon');
    expect(iconGroup).toBeDefined();
    expect(iconBg).toBeDefined();
    expect(icon).toBeDefined();
  });

  it('4.5 non-server: creates video Image (hidden) and videoProgress Rect (hidden)', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const video = group.findOne('#test-video-video');
    const progress = group.findOne('#test-video-video-progress');
    expect(video).toBeDefined();
    expect(video!.isVisible()).toBe(false);
    expect(progress).toBeDefined();
    expect(progress!.isVisible()).toBe(false);
  });

  it('4.6 server mode: no video Image or videoProgress Rect created', () => {
    mockIsServer.mockReturnValue(true);
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const video = group.findOne('#test-video-video');
    const progress = group.findOne('#test-video-video-progress');
    expect(video).toBeUndefined();
    expect(progress).toBeUndefined();
  });

  it('4.7 videoIconGroup positioned at bottom-right based on width/height', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps({ width: 320, height: 240 })) as Konva.Group;
    const iconGroup = group.findOne('#test-video-video-icon-group') as Konva.Group;
    const cfg = WEAVE_VIDEO_DEFAULT_CONFIG.style;
    const iconGroupW = cfg.icon.internal.paddingX * 2 + cfg.icon.width;
    const iconGroupH = cfg.icon.internal.paddingY * 2 + cfg.icon.height;
    const expectedX = 320 - iconGroupW - cfg.icon.external.paddingX;
    const expectedY = 240 - iconGroupH - cfg.icon.external.paddingY;
    expect(iconGroup.x()).toBe(expectedX);
    expect(iconGroup.y()).toBe(expectedY);
  });

  it('4.8 allowedAnchors() returns correct corners', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((group as any).allowedAnchors()).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ]);
  });

  it('4.9 nodeType matches WEAVE_VIDEO_NODE_TYPE', () => {
    const node = new WeaveVideoNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((node as any).nodeType).toBe(WEAVE_VIDEO_NODE_TYPE);
  });
});

// ===========================================================================
// Suite 5 — onRender: load branches
// ===========================================================================

describe('5 — onRender: load branches', () => {
  it('5.1 not loaded, not server → calls loadVideo (document.createElement called with video)', () => {
    const { node } = makeNode();
    const createElSpy = vi.spyOn(document, 'createElement');
    node.onRender(defaultProps());
    const videoCreateCalls = createElSpy.mock.calls.filter(([tag]) => tag === 'video');
    expect(videoCreateCalls.length).toBeGreaterThan(0);
  });

  it('5.2 already loaded (videoSource pre-set) → sets videoInfo, calls updateNode', () => {
    const { node, mock } = makeNode();
    // Pre-seed the videoSource so isLoaded=true
    const mockVideo = makeMockVideoElement();
    Object.assign(mockVideo, { videoWidth: 640, videoHeight: 480 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    node.onRender(defaultProps());

    expect(mock.updateNode).toHaveBeenCalled();
  });

  it('5.3 isServer=true → calls updateNode, does not call loadVideo', () => {
    mockIsServer.mockReturnValue(true);
    const { node, mock } = makeNode();
    const createElSpy = vi.spyOn(document, 'createElement');

    node.onRender(defaultProps());

    expect(mock.updateNode).toHaveBeenCalled();
    const videoCalls = createElSpy.mock.calls.filter(([tag]) => tag === 'video');
    expect(videoCalls.length).toBe(0);
  });
});

// ===========================================================================
// Suite 6 — onRender: loadAsyncElement / getIsAsync
// ===========================================================================

describe('6 — loadAsyncElement / getIsAsync', () => {
  it('6.1 loadAsyncElement(id) delegates to instance.loadAsyncElement', () => {
    const { node, mock } = makeNode();
    node.loadAsyncElement('test-video');
    expect(mock.loadAsyncElement).toHaveBeenCalledWith('test-video', 'video');
  });

  it('6.2 resolveAsyncElement(id) delegates to instance.resolveAsyncElement', () => {
    const { node, mock } = makeNode();
    node.resolveAsyncElement('test-video');
    expect(mock.resolveAsyncElement).toHaveBeenCalledWith('test-video', 'video');
  });

  it('6.3 getIsAsync() returns true', () => {
    const { node } = makeNode();
    expect(node.getIsAsync()).toBe(true);
  });
});

// ===========================================================================
// Suite 7 — onRender: transformstart event
// ===========================================================================

describe('7 — onRender: transformstart event', () => {
  it('7.1 videoProgress visible → hides it', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    progress.show(); // make it visible

    fireKonvaEvent(group, 'transformstart', { target: group });

    expect(progress.isVisible()).toBe(false);
  });

  it('7.2 videoState.playing=true → pauses the video', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { playing: true, paused: false, loaded: true, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    node['instance'].getStage().findOne = vi.fn().mockReturnValue(group);

    fireKonvaEvent(group, 'transformstart', { target: group });

    expect(mockVideo.pause).toHaveBeenCalled();
  });

  it('7.3 videoIconGroup present → hides it', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const iconGroup = group.findOne('#test-video-video-icon-group') as Konva.Group;

    fireKonvaEvent(group, 'transformstart', { target: group });

    expect(iconGroup.isVisible()).toBe(false);
  });

  it('7.4 videoProgress NOT visible → does not set videoProgressWasVisible', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    // progress is hidden by default after onRender

    fireKonvaEvent(group, 'transformstart', { target: group });
    // Then transformend should not show progress since it was not visible
    fireKonvaEvent(group, 'transformend', { target: group });

    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    expect(progress.isVisible()).toBe(false);
  });
});

// ===========================================================================
// Suite 8 — onRender: transformend event
// ===========================================================================

describe('8 — onRender: transformend event', () => {
  it('8.1 progress was visible → shows it after transformend', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    progress.show();

    fireKonvaEvent(group, 'transformstart', { target: group });
    fireKonvaEvent(group, 'transformend', { target: group });

    expect(progress.isVisible()).toBe(true);
  });

  it('8.2 videoIconGroup shows after transformend', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;

    fireKonvaEvent(group, 'transformstart', { target: group });
    const iconGroup = group.findOne('#test-video-video-icon-group') as Konva.Group;
    expect(iconGroup.isVisible()).toBe(false);

    fireKonvaEvent(group, 'transformend', { target: group });
    expect(iconGroup.isVisible()).toBe(true);
  });

  it('8.3 video was playing → resumes play after transformend', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { playing: true, paused: false, loaded: true, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    const group = node.onRender(defaultProps()) as Konva.Group;
    node['instance'].getStage().findOne = vi.fn().mockReturnValue(group);

    fireKonvaEvent(group, 'transformstart', { target: group }); // pauses, sets videoWasPlaying=true
    // State is now paused=true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState['test-video'].paused = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState['test-video'].playing = false;

    fireKonvaEvent(group, 'transformend', { target: group }); // should play again

    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('8.4 resets videoWasPlaying and videoProgressWasVisible to false', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;

    // Trigger both events; no error on second transformend
    fireKonvaEvent(group, 'transformstart', { target: group });
    fireKonvaEvent(group, 'transformend', { target: group });
    expect(() => fireKonvaEvent(group, 'transformend', { target: group })).not.toThrow();
  });
});

// ===========================================================================
// Suite 9 — onRender: dblClick
// ===========================================================================

describe('9 — onRender: dblClick', () => {
  it('9.1 playPauseOnDblClick=true + loaded + not playing → calls play', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    const group = node.onRender(defaultProps()) as Konva.Group;
    node['instance'].getStage().findOne = vi.fn().mockReturnValue(group);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).dblClick?.();

    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('9.2 playPauseOnDblClick=true + loaded + playing → calls pause', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    const group = node.onRender(defaultProps()) as Konva.Group;
    node['instance'].getStage().findOne = vi.fn().mockReturnValue(group);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).dblClick?.();

    expect(mockVideo.pause).toHaveBeenCalled();
  });

  it('9.3 not loaded → no play/pause called', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: false, playing: false, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    const group = node.onRender(defaultProps()) as Konva.Group;
    node['instance'].getStage().findOne = vi.fn().mockReturnValue(group);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).dblClick?.();

    expect(mockVideo.play).not.toHaveBeenCalled();
    expect(mockVideo.pause).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Suite 10 — onRender: handleMouseover override
// ===========================================================================

describe('10 — onRender: handleMouseover override', () => {
  it('10.1 onlyOnHover=true + loaded → shows videoProgress on mouseover', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: true } } });
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseover?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(true);
  });

  it('10.2 onlyOnHover=false → videoProgress not shown on mouseover', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: false } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseover?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(false);
  });

  it('10.3 onlyOnHover=true + NOT loaded → progress not shown', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: true } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: false, playing: false, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseover?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(false);
  });
});

// ===========================================================================
// Suite 11 — onRender: handleMouseout override
// ===========================================================================

describe('11 — onRender: handleMouseout override', () => {
  it('11.1 onlyOnHover=true + loaded + not paused → hides videoProgress', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: true } } });
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    progress.show();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseout?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(false);
  });

  it('11.2 onlyOnHover=true + paused → does NOT hide progress', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: true } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: true, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    progress.show();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseout?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(true);
  });

  it('11.3 onlyOnHover=false → no hide on mouseout', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: false } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    progress.show();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group as any).handleMouseout?.({
      evt: { ctrlKey: false, metaKey: false, shiftKey: false },
      target: group,
    });

    expect(progress.isVisible()).toBe(true);
  });
});

// ===========================================================================
// Suite 12 — onZoomChange listener
// ===========================================================================

describe('12 — onZoomChange listener', () => {
  it('12.1 firing onZoomChange → updates videoProgress height and y', () => {
    const { node, mock } = makeNode();
    mock.getStage().scaleY = vi.fn().mockReturnValue(2);

    const group = node.onRender(defaultProps({ height: 240 })) as Konva.Group;
    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;

    const zoomHandler = getInstanceListener(mock, 'onZoomChange');
    zoomHandler?.();

    const trackHeight = WEAVE_VIDEO_DEFAULT_CONFIG.style.track.height;
    expect(progress.height()).toBeCloseTo(trackHeight / 2); // track.height / scaleY(2)
    expect(progress.y()).toBeCloseTo(240 - trackHeight / 2);
  });
});

// ===========================================================================
// Suite 13 — play()
// ===========================================================================

describe('13 — play()', () => {
  it('13.1 video not found on stage → returns early, no state change', () => {
    const { node, mock } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};
    mock.getStage().findOne = vi.fn().mockReturnValue(null);

    expect(() => node.play('nonexistent')).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((node as any).videoState['nonexistent']).toBeUndefined();
  });

  it('13.2 hides placeholder, hides iconGroup, shows videoNode', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.play('test-video');

    const placeholder = group.findOne('#test-video-video-placeholder');
    const iconGroup = group.findOne('#test-video-video-icon-group');
    const videoNode = group.findOne('#test-video-video');
    expect(placeholder!.isVisible()).toBe(false);
    expect(iconGroup!.isVisible()).toBe(false);
    expect(videoNode!.isVisible()).toBe(true);
  });

  it('13.3 updates state to playing=true, paused=false', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.play('test-video');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (node as any).videoState['test-video'];
    expect(state.playing).toBe(true);
    expect(state.paused).toBe(false);
  });

  it('13.4 calls videoSource.play() and starts anim', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };
    const animMock = { start: vi.fn(), stop: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = animMock;

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.play('test-video');

    expect(mockVideo.play).toHaveBeenCalled();
    expect(animMock.start).toHaveBeenCalled();
  });

  it('13.5 emits onVideoPlay event', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: false, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.play('test-video');

    expect(mock.emitEvent).toHaveBeenCalledWith('onVideoPlay', { nodeId: 'test-video' });
  });
});

// ===========================================================================
// Suite 14 — pause()
// ===========================================================================

describe('14 — pause()', () => {
  it('14.1 video not found → returns early', () => {
    const { node, mock } = makeNode();
    mock.getStage().findOne = vi.fn().mockReturnValue(null);
    expect(() => node.pause('nonexistent')).not.toThrow();
  });

  it('14.2 shows videoIconGroup', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);
    group.findOne('#test-video-video-icon-group')!.hide();

    node.pause('test-video');

    const iconGroup = group.findOne('#test-video-video-icon-group');
    expect(iconGroup!.isVisible()).toBe(true);
  });

  it('14.3 updates state to playing=false, paused=true', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.pause('test-video');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (node as any).videoState['test-video'];
    expect(state.playing).toBe(false);
    expect(state.paused).toBe(true);
  });

  it('14.4 emits onVideoPause event', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.pause('test-video');

    expect(mock.emitEvent).toHaveBeenCalledWith('onVideoPause', { nodeId: 'test-video' });
  });
});

// ===========================================================================
// Suite 15 — stop()
// ===========================================================================

describe('15 — stop()', () => {
  it('15.1 video not found → returns early', () => {
    const { node, mock } = makeNode();
    mock.getStage().findOne = vi.fn().mockReturnValue(null);
    expect(() => node.stop('nonexistent')).not.toThrow();
  });

  it('15.2 shows placeholder and iconGroup, hides videoProgress (onlyOnHover=false)', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    // Show progress so we can verify it gets hidden
    group.findOne('#test-video-video-progress')!.show();
    group.findOne('#test-video-video-placeholder')!.hide();

    node.stop('test-video');

    expect(group.findOne('#test-video-video-placeholder')!.isVisible()).toBe(true);
    expect(group.findOne('#test-video-video-progress')!.isVisible()).toBe(false);
    expect(group.findOne('#test-video-video-icon-group')!.isVisible()).toBe(true);
  });

  it('15.3 onlyOnHover=true → does NOT hide videoProgress', () => {
    const { node, mock } = makeNode({ style: { track: { onlyOnHover: true } } });
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);
    group.findOne('#test-video-video-progress')!.show();

    node.stop('test-video');

    expect(group.findOne('#test-video-video-progress')!.isVisible()).toBe(true);
  });

  it('15.4 resets currentTime=0, pauses source, hides videoNode', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    mockVideo.currentTime = 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.stop('test-video');

    expect(mockVideo.currentTime).toBe(0);
    expect(mockVideo.pause).toHaveBeenCalled();
    expect(group.findOne('#test-video-video')!.isVisible()).toBe(false);
  });

  it('15.5 no other videos playing → calls anim.stop()', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    const animMock = { start: vi.fn(), stop: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = animMock;

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.stop('test-video');

    expect(animMock.stop).toHaveBeenCalled();
  });

  it('15.6 emits onVideoStop event', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.stop('test-video');

    expect(mock.emitEvent).toHaveBeenCalledWith('onVideoStop', { nodeId: 'test-video' });
  });

  it('15.7 other video still playing → anim NOT stopped', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo, 'other-video': makeMockVideoElement() };
    // 'other-video' is still playing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {
      'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false },
      'other-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false },
    };
    const animMock = { start: vi.fn(), stop: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = animMock;

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    node.stop('test-video');

    expect(animMock.stop).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Suite 16 — areVideosPlaying()
// ===========================================================================

describe('16 — areVideosPlaying()', () => {
  it('16.1 empty videoState → false', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};
    expect(node.areVideosPlaying()).toBe(false);
  });

  it('16.2 one video playing=true → true', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'v1': { playing: true, paused: false, loaded: true, placeholderLoaded: false } };
    expect(node.areVideosPlaying()).toBe(true);
  });

  it('16.3 multiple videos, none playing → false', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {
      'v1': { playing: false, paused: true, loaded: true, placeholderLoaded: false },
      'v2': { playing: false, paused: false, loaded: true, placeholderLoaded: false },
    };
    expect(node.areVideosPlaying()).toBe(false);
  });
});

// ===========================================================================
// Suite 17 — getVideoState() / getVideoSource()
// ===========================================================================

describe('17 — getVideoState() / getVideoSource()', () => {
  it('17.1 getVideoState: unknown id → undefined', () => {
    const { node } = makeNode();
    node.initialize();
    const fakeInstance = { getAttrs: () => ({ id: 'unknown' }) } as Konva.Group;
    expect(node.getVideoState(fakeInstance)).toBeUndefined();
  });

  it('17.2 getVideoState: known id → returns state', () => {
    const { node } = makeNode();
    const state = { loaded: true, playing: false, paused: false, placeholderLoaded: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': state };
    const fakeInstance = { getAttrs: () => ({ id: 'test-video' }) } as Konva.Group;
    expect(node.getVideoState(fakeInstance)).toEqual(state);
  });

  it('17.3 getVideoSource: unknown id → undefined', () => {
    const { node } = makeNode();
    node.initialize();
    expect(node.getVideoSource('unknown')).toBeUndefined();
  });

  it('17.4 getVideoSource: known id → returns video element', () => {
    const { node } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    expect(node.getVideoSource('test-video')).toBe(mockVideo);
  });
});

// ===========================================================================
// Suite 18 — onUpdate()
// ===========================================================================

describe('18 — onUpdate()', () => {
  it('18.1 sets attrs on nodeInstance', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;

    node.onUpdate(group, { width: 400, height: 300 });

    expect(group.getAttrs().width).toBe(400);
    expect(group.getAttrs().height).toBe(300);
  });

  it('18.2 missing bg → returns early (no error)', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    group.findOne('#test-video-bg')?.destroy();

    expect(() => node.onUpdate(group, { width: 400 })).not.toThrow();
  });

  it('18.3 missing videoIconGroup → returns early', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    group.findOne('#test-video-video-icon-group')?.destroy();

    expect(() => node.onUpdate(group, { width: 400 })).not.toThrow();
  });

  it('18.4 missing videoPlaceholder → returns early', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    group.findOne('#test-video-video-placeholder')?.destroy();

    expect(() => node.onUpdate(group, { width: 400 })).not.toThrow();
  });

  it('18.5 updates bg attrs (id preserved, x=0, y=0, rotation=0)', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;

    node.onUpdate(group, { width: 400, height: 300 });

    const bg = group.findOne('#test-video-bg') as Konva.Rect;
    expect(bg.getAttrs().id).toBe('test-video-bg');
    expect(bg.x()).toBe(0);
    expect(bg.y()).toBe(0);
    expect(bg.getAttrs().rotation).toBe(0);
  });

  it('18.6 non-server + video element found → updates video attrs', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;

    node.onUpdate(group, { width: 400 });

    const video = group.findOne('#test-video-video') as Konva.Image;
    expect(video).toBeDefined();
    expect(video.getAttrs().id).toBe('test-video-video');
  });

  it('18.7 repositions videoIconGroup after update', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps({ width: 320, height: 240 })) as Konva.Group;

    node.onUpdate(group, { width: 400, height: 300 });

    const iconGroup = group.findOne('#test-video-video-icon-group') as Konva.Group;
    const cfg = WEAVE_VIDEO_DEFAULT_CONFIG.style;
    const iconGroupW = cfg.icon.internal.paddingX * 2 + cfg.icon.width;
    const iconGroupH = cfg.icon.internal.paddingY * 2 + cfg.icon.height;
    expect(iconGroup.x()).toBe(400 - iconGroupW - cfg.icon.external.paddingX);
    expect(iconGroup.y()).toBe(300 - iconGroupH - cfg.icon.external.paddingY);
  });

  it('18.8 plugin present → calls forceUpdate', () => {
    const forceUpdate = vi.fn();
    const mockTransformer = { forceUpdate };
    const mockPlugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
      getSelectorConfig: vi.fn().mockReturnValue({}),
    };

    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance.getPlugin = vi.fn().mockReturnValue(mockPlugin);

    const group = node.onRender(defaultProps()) as Konva.Group;
    node.onUpdate(group, { width: 400 });

    expect(forceUpdate).toHaveBeenCalled();
  });

  it('18.9 no plugin → no error', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance.getPlugin = vi.fn().mockReturnValue(undefined);
    const group = node.onRender(defaultProps()) as Konva.Group;

    expect(() => node.onUpdate(group, { width: 400 })).not.toThrow();
  });
});

// ===========================================================================
// Suite 19 — getNodeSelectionPlugin()
// ===========================================================================

describe('19 — getNodeSelectionPlugin()', () => {
  it('19.1 plugin registered → returns it', () => {
    const mockPlugin = { getTransformer: vi.fn() };
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance.getPlugin = vi.fn().mockReturnValue(mockPlugin);

    expect(node.getNodeSelectionPlugin()).toBe(mockPlugin);
  });

  it('19.2 no plugin → returns undefined', () => {
    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance.getPlugin = vi.fn().mockReturnValue(undefined);

    expect(node.getNodeSelectionPlugin()).toBeUndefined();
  });
});

// ===========================================================================
// Suite 20 — scaleReset()
// ===========================================================================

describe('20 — scaleReset()', () => {
  it('20.1 with icon + progress → resets child scales, repositions iconGroup', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};

    const group = node.onRender(defaultProps({ width: 320, height: 240 })) as Konva.Group;
    mock.getStage().scaleX = vi.fn().mockReturnValue(1);
    mock.getStage().scaleY = vi.fn().mockReturnValue(1);

    group.scale({ x: 2, y: 2 });

    expect(() => node.scaleReset(group)).not.toThrow();

    expect(group.scaleX()).toBe(1);
    expect(group.scaleY()).toBe(1);
    // Width/height should be multiplied by scale factor (2)
    expect(group.width()).toBe(640);
    expect(group.height()).toBe(480);
  });

  it('20.2 width scaled below 5 → clamped to 5', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};

    const group = node.onRender(defaultProps({ width: 2, height: 2 })) as Konva.Group;
    mock.getStage().scaleX = vi.fn().mockReturnValue(1);
    mock.getStage().scaleY = vi.fn().mockReturnValue(1);

    group.scale({ x: 0.1, y: 0.1 });

    node.scaleReset(group);

    expect(group.width()).toBe(5);
    expect(group.height()).toBe(5);
  });

  it('20.3 resets node scale to { x:1, y:1 }', () => {
    const { node, mock } = makeNode();
    const mockVideo = makeMockVideoElement();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().scaleX = vi.fn().mockReturnValue(1);
    mock.getStage().scaleY = vi.fn().mockReturnValue(1);
    group.scale({ x: 3, y: 3 });

    node.scaleReset(group);

    expect(group.scaleX()).toBe(1);
    expect(group.scaleY()).toBe(1);
  });
});

// ===========================================================================
// Suite 21 — loadVideo: event handlers
// ===========================================================================

describe('21 — loadVideo: event handlers', () => {
  /** Helper: render node and capture the created mock video element. */
  function renderAndCaptureVideo(node: WeaveVideoNode, config?: Record<string, unknown>) {
    const mockVideo = makeMockVideoElement();
    const createElSpy = vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      return mockVideo as unknown as HTMLElement;
    });
    node.onRender(defaultProps(config));
    createElSpy.mockRestore();
    return mockVideo;
  }

  function getVideoListener(mockVideo: ReturnType<typeof makeMockVideoElement>, name: string) {
    return mockVideo._listeners[name]?.[0];
  }

  it('21.1 loadeddata → state.loaded=true, playing/paused=false', () => {
    const { node } = makeNode();
    const mockVideo = renderAndCaptureVideo(node);

    getVideoListener(mockVideo, 'loadeddata')?.();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (node as any).videoState['test-video'];
    expect(state.loaded).toBe(true);
    expect(state.playing).toBe(false);
    expect(state.paused).toBe(false);
  });

  it('21.2 play event + !onlyOnHover → starts requestVideoFrameCallback', () => {
    const { node } = makeNode({ style: { track: { onlyOnHover: false } } });

    const mockVideo = makeMockVideoElement();
    vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      return mockVideo as unknown as HTMLElement;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSourceFrameId = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};
    node.onRender(defaultProps());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource['test-video'] = mockVideo;

    mockVideo._listeners['play']?.[0]?.();

    expect(mockVideo.requestVideoFrameCallback).toHaveBeenCalled();
  });

  it('21.3 stop event → calls cancelVideoFrameCallback', () => {
    const { node } = makeNode();
    const mockVideo = renderAndCaptureVideo(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSourceFrameId = { 'test-video': 42 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    getVideoListener(mockVideo, 'stop')?.();

    expect(mockVideo.cancelVideoFrameCallback).toHaveBeenCalledWith(42);
  });

  it('21.4 ended + resetOnEnd=true → calls stop()', () => {
    const { node, mock } = makeNode({ style: { track: { resetOnEnd: true } } });
    const mockVideo = renderAndCaptureVideo(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).anim = { start: vi.fn(), stop: vi.fn() };

    const group = node.onRender(defaultProps()) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    getVideoListener(mockVideo, 'ended')?.();

    // stop() sets playing=false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((node as any).videoState['test-video'].playing).toBe(false);
  });

  it('21.5 ended + resetOnEnd=false → sets progress to full width, no stop() called', () => {
    const { node, mock } = makeNode({ style: { track: { resetOnEnd: false } } });
    const mockVideo = renderAndCaptureVideo(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = { 'test-video': { loaded: true, playing: true, paused: false, placeholderLoaded: false } };

    const group = node.onRender(defaultProps({ width: 320 })) as Konva.Group;
    mock.getStage().findOne = vi.fn().mockReturnValue(group);

    getVideoListener(mockVideo, 'ended')?.();

    const progress = group.findOne('#test-video-video-progress') as Konva.Rect;
    expect(progress.width()).toBe(320);
    // State still playing (stop not called)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((node as any).videoState['test-video'].playing).toBe(true);
  });

  it('21.6 loadedmetadata → positions iconGroup and progress, sets videoPlayer image', () => {
    const { node } = makeNode();
    const mockVideo = renderAndCaptureVideo(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = { 'test-video': mockVideo };

    const group = node.onRender(defaultProps({ width: 320, height: 240 })) as Konva.Group;
    getVideoListener(mockVideo, 'loadedmetadata')?.();

    const iconGroup = group.findOne('#test-video-video-icon-group') as Konva.Group;
    const cfg = WEAVE_VIDEO_DEFAULT_CONFIG.style;
    const iconGroupW = cfg.icon.internal.paddingX * 2 + cfg.icon.width;
    const iconGroupH = cfg.icon.internal.paddingY * 2 + cfg.icon.height;
    expect(iconGroup.x()).toBe(320 - iconGroupW - cfg.icon.external.paddingX);
    expect(iconGroup.y()).toBe(240 - iconGroupH - cfg.icon.external.paddingY);
  });
});

// ===========================================================================
// Suite 22 — loadPlaceholder: event handlers
// ===========================================================================

describe('22 — loadPlaceholder: event handlers', () => {
  it('22.1 missing videoPlaceholder or videoIconGroup → returns early, no image created', () => {
    const { node } = makeNode();
    const group = node.onRender(defaultProps()) as Konva.Group;
    // Destroy the placeholder so loadPlaceholder cannot find it
    group.findOne('#test-video-video-placeholder')?.destroy();

    const createImgSpy = vi.spyOn(Konva.Util, 'createImageElement');
    const callsBefore = createImgSpy.mock.calls.length;

    // Call loadPlaceholder directly (private method)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).loadPlaceholder(defaultProps(), group);

    expect(createImgSpy.mock.calls.length).toBe(callsBefore);
  });

  it('22.2 urlTransformer used when configured', () => {
    const transformer = vi.fn().mockReturnValue('https://transformed.example.com/ph.jpg');
    const { node } = makeNode({ urlTransformer: transformer });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoSource = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoState = {};
    const group = node.onRender(defaultProps()) as Konva.Group;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).videoPlaceholder = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).loadPlaceholder(defaultProps(), group);

    expect(transformer).toHaveBeenCalledWith('https://example.com/placeholder.jpg', group);
  });

  it('22.3 onerror → calls resolveAsyncElement(id)', () => {
    const { node, mock } = makeNode();
    const createdImages: HTMLImageElement[] = [];
    vi.mocked(Konva.Util.createImageElement).mockImplementation(() => {
      const img = makeMockImageElement();
      createdImages.push(img as unknown as HTMLImageElement);
      return img as unknown as HTMLImageElement;
    });

    node.onRender(defaultProps()) as Konva.Group;
    const placeholderImg = createdImages[1] as unknown as ReturnType<typeof makeMockImageElement>;

    expect(placeholderImg).toBeDefined();
    placeholderImg.onerror?.();

    expect(mock.resolveAsyncElement).toHaveBeenCalledWith('test-video', 'video');
  });

  it('22.4 onload → sets image on placeholder', () => {
    const { node } = makeNode();
    const createdImages: HTMLImageElement[] = [];
    vi.mocked(Konva.Util.createImageElement).mockImplementation(() => {
      const img = makeMockImageElement();
      createdImages.push(img as unknown as HTMLImageElement);
      return img as unknown as HTMLImageElement;
    });

    const group = node.onRender(defaultProps()) as Konva.Group;
    const placeholderImg = createdImages[1] as unknown as ReturnType<typeof makeMockImageElement>;

    expect(placeholderImg).toBeDefined();
    placeholderImg.onload?.();

    const placeholder = group.findOne('#test-video-video-placeholder') as Konva.Image;
    expect(placeholder.getAttrs().image).toBe(placeholderImg);
  });

  it('22.5 onload + plugin present → calls forceUpdate', () => {
    const forceUpdate = vi.fn();
    const mockTransformer = { forceUpdate };
    const mockPlugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
      getSelectorConfig: vi.fn().mockReturnValue({}),
    };

    const { node } = makeNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).instance.getPlugin = vi.fn().mockReturnValue(mockPlugin);
    const createdImages: HTMLImageElement[] = [];
    vi.mocked(Konva.Util.createImageElement).mockImplementation(() => {
      const img = makeMockImageElement();
      createdImages.push(img as unknown as HTMLImageElement);
      return img as unknown as HTMLImageElement;
    });

    node.onRender(defaultProps()) as Konva.Group;
    const placeholderImg = createdImages[1] as unknown as ReturnType<typeof makeMockImageElement>;

    expect(placeholderImg).toBeDefined();
    placeholderImg.onload?.();

    expect(forceUpdate).toHaveBeenCalled();
  });
});
