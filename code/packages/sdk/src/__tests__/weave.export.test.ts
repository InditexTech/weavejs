// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, expect, it, vi } from 'vitest';
import { WEAVE_EXPORT_RETURN_FORMAT } from '@inditextech/weave-types';
import { Weave } from '@/weave';

vi.mock('@/managers/setup');
vi.mock('@/managers/register');
vi.mock('@/managers/store');
vi.mock('@/managers/state');
vi.mock('@/managers/stage');
vi.mock('@/managers/groups');
vi.mock('@/managers/targeting');
vi.mock('@/managers/cloning');
vi.mock('@/managers/fonts');
vi.mock('@/managers/zindex');
vi.mock('@/managers/export/export');
vi.mock('@/managers/actions');
vi.mock('@/managers/plugins');
vi.mock('@/managers/users/users');
vi.mock('@/managers/mutex/mutex');
vi.mock('@/managers/async/async');
vi.mock('@/managers/hooks');
vi.mock('@/managers/drag-and-drop');
vi.mock('@/nodes/node', () => ({
  augmentKonvaNodeClass: vi.fn(),
  WeaveNode: class {},
}));
vi.mock('@/utils/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...original,
    getExportBoundingBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 200 }),
  };
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeWeave() {
  const renderer = { register: vi.fn(), init: vi.fn(), render: vi.fn() };
  const doc = {
    destroy: vi.fn(),
    getMap: vi.fn().mockReturnValue({ toJSON: vi.fn().mockReturnValue({}) }),
  };
  const store = {
    setup: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getDocument: vi.fn().mockReturnValue(doc),
    getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    setState: vi.fn(),
  };
  const stage = { findOne: vi.fn().mockReturnValue(null), destroy: vi.fn() };

  const weave = new Weave(
    { store: store as any, renderer: renderer as any },
    { container: 'c', width: 100, height: 100 }
  );

  (weave as any).storeManager.getStore.mockReturnValue(store);
  (weave as any).stageManager.getStage.mockReturnValue(stage);

  // Set up exportManager mocks
  const exportManager = (weave as any).exportManager;
  exportManager.imageToBase64.mockReturnValue('base64string');
  exportManager.exportNodesServerSide.mockResolvedValue({ composites: [], width: 100, height: 100 });
  exportManager.exportAreaServerSide.mockResolvedValue({ composites: [], width: 100, height: 100 });
  exportManager.exportNodesAsBlob.mockResolvedValue(new Blob());
  exportManager.exportNodesAsCanvas.mockResolvedValue(document.createElement('canvas'));
  exportManager.exportNodesAsImage.mockResolvedValue(new Image());
  exportManager.exportAreaAsBlob.mockResolvedValue(new Blob());
  exportManager.exportAreaAsCanvas.mockResolvedValue(document.createElement('canvas'));
  exportManager.exportAreaAsImage.mockResolvedValue(new Image());
  exportManager.blobToDataURL.mockResolvedValue('data:image/png;base64,abc');

  return { weave, store, stage, exportManager };
}

// ---------------------------------------------------------------------------
// Suite 36 — Export methods
// ---------------------------------------------------------------------------

describe('Weave — imageToBase64()', () => {
  it('delegates to exportManager.imageToBase64()', () => {
    const { weave, exportManager } = makeWeave();
    const img = new Image();
    const result = weave.imageToBase64(img, 'image/png');
    expect(exportManager.imageToBase64).toHaveBeenCalledWith(img, 'image/png');
    expect(result).toBe('base64string');
  });
});

describe('Weave — exportNodesServerSide()', () => {
  it('delegates to exportManager.exportNodesServerSide()', async () => {
    const { weave, exportManager } = makeWeave();
    const boundingFn = vi.fn();
    const options = {} as any;
    await weave.exportNodesServerSide(['n1'], boundingFn, options);
    expect(exportManager.exportNodesServerSide).toHaveBeenCalledWith(['n1'], boundingFn, options);
  });
});

describe('Weave — exportAreaServerSide()', () => {
  it('delegates to exportManager.exportAreaServerSide()', async () => {
    const { weave, exportManager } = makeWeave();
    const area = { x: 0, y: 0, width: 100, height: 100 };
    const options = {} as any;
    await weave.exportAreaServerSide(area, options);
    expect(exportManager.exportAreaServerSide).toHaveBeenCalledWith(area, options);
  });
});

describe('Weave — exportNodes() — 4 formats', () => {
  it('BLOB → calls exportManager.exportNodesAsBlob and returns Blob', async () => {
    const { weave, exportManager } = makeWeave();
    const blob = new Blob();
    exportManager.exportNodesAsBlob.mockResolvedValue(blob);
    const nodes = [] as any;
    const bfn = vi.fn();
    const opts = {} as any;
    const result = await weave.exportNodes(nodes, bfn, opts, WEAVE_EXPORT_RETURN_FORMAT.BLOB);
    expect(exportManager.exportNodesAsBlob).toHaveBeenCalledWith(nodes, bfn, opts);
    expect(result).toBe(blob);
  });

  it('CANVAS → calls exportManager.exportNodesAsCanvas and returns canvas', async () => {
    const { weave, exportManager } = makeWeave();
    const canvas = document.createElement('canvas');
    exportManager.exportNodesAsCanvas.mockResolvedValue(canvas);
    const nodes = [] as any;
    const bfn = vi.fn();
    const opts = {} as any;
    const result = await weave.exportNodes(nodes, bfn, opts, WEAVE_EXPORT_RETURN_FORMAT.CANVAS);
    expect(exportManager.exportNodesAsCanvas).toHaveBeenCalledWith(nodes, bfn, opts);
    expect(result).toBe(canvas);
  });

  it('DATA_URL → calls exportNodesAsBlob then blobToDataURL', async () => {
    const { weave, exportManager } = makeWeave();
    const blob = new Blob();
    exportManager.exportNodesAsBlob.mockResolvedValue(blob);
    exportManager.blobToDataURL.mockResolvedValue('data:image/png;base64,xyz');
    const nodes = [] as any;
    const bfn = vi.fn();
    const opts = {} as any;
    const result = await weave.exportNodes(nodes, bfn, opts, WEAVE_EXPORT_RETURN_FORMAT.DATA_URL);
    expect(exportManager.exportNodesAsBlob).toHaveBeenCalledWith(nodes, bfn, opts);
    expect(exportManager.blobToDataURL).toHaveBeenCalledWith(blob);
    expect(result).toBe('data:image/png;base64,xyz');
  });

  it('IMAGE (default) → calls exportManager.exportNodesAsImage', async () => {
    const { weave, exportManager } = makeWeave();
    const img = new Image();
    exportManager.exportNodesAsImage.mockResolvedValue(img);
    const nodes = [] as any;
    const bfn = vi.fn();
    const opts = {} as any;
    const result = await weave.exportNodes(nodes, bfn, opts, WEAVE_EXPORT_RETURN_FORMAT.IMAGE);
    expect(exportManager.exportNodesAsImage).toHaveBeenCalledWith(nodes, bfn, opts);
    expect(result).toBe(img);
  });
});

describe('Weave — exportArea() — 4 formats', () => {
  const area = { x: 0, y: 0, width: 100, height: 100 };
  const opts = {} as any;

  it('BLOB → calls exportManager.exportAreaAsBlob', async () => {
    const { weave, exportManager } = makeWeave();
    const blob = new Blob();
    exportManager.exportAreaAsBlob.mockResolvedValue(blob);
    const result = await weave.exportArea(area, opts, WEAVE_EXPORT_RETURN_FORMAT.BLOB);
    expect(exportManager.exportAreaAsBlob).toHaveBeenCalledWith(area, opts);
    expect(result).toBe(blob);
  });

  it('CANVAS → calls exportManager.exportAreaAsCanvas', async () => {
    const { weave, exportManager } = makeWeave();
    const canvas = document.createElement('canvas');
    exportManager.exportAreaAsCanvas.mockResolvedValue(canvas);
    const result = await weave.exportArea(area, opts, WEAVE_EXPORT_RETURN_FORMAT.CANVAS);
    expect(exportManager.exportAreaAsCanvas).toHaveBeenCalledWith(area, opts);
    expect(result).toBe(canvas);
  });

  it('DATA_URL → calls exportAreaAsBlob then blobToDataURL', async () => {
    const { weave, exportManager } = makeWeave();
    const blob = new Blob();
    exportManager.exportAreaAsBlob.mockResolvedValue(blob);
    exportManager.blobToDataURL.mockResolvedValue('data:image/png;base64,xyz');
    const result = await weave.exportArea(area, opts, WEAVE_EXPORT_RETURN_FORMAT.DATA_URL);
    expect(exportManager.exportAreaAsBlob).toHaveBeenCalledWith(area, opts);
    expect(exportManager.blobToDataURL).toHaveBeenCalledWith(blob);
    expect(result).toBe('data:image/png;base64,xyz');
  });

  it('IMAGE → calls exportManager.exportAreaAsImage', async () => {
    const { weave, exportManager } = makeWeave();
    const img = new Image();
    exportManager.exportAreaAsImage.mockResolvedValue(img);
    const result = await weave.exportArea(area, opts, WEAVE_EXPORT_RETURN_FORMAT.IMAGE);
    expect(exportManager.exportAreaAsImage).toHaveBeenCalledWith(area, opts);
    expect(result).toBe(img);
  });
});

describe('Weave — getExportBoundingBox()', () => {
  it('includes nodeInstance when findOne returns a value', async () => {
    const { weave, stage } = makeWeave();
    const { getExportBoundingBox } = await import('@/utils/utils');
    const nodeInstance = { id: 'n1' };
    stage.findOne.mockReturnValue(nodeInstance);
    weave.getExportBoundingBox(['n1']);
    expect(getExportBoundingBox).toHaveBeenCalledWith([nodeInstance]);
  });

  it('skips nodes where findOne returns null', async () => {
    const { weave, stage } = makeWeave();
    const { getExportBoundingBox } = await import('@/utils/utils');
    stage.findOne.mockReturnValue(null);
    weave.getExportBoundingBox(['n1', 'n2']);
    expect(getExportBoundingBox).toHaveBeenCalledWith([]);
  });
});
