// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Weave } from '@/weave';
import { type WeaveElementInstance, WEAVE_NODE_POSITION } from '@inditextech/weave-types';
import { WeaveZIndexManager } from '@/managers/zindex';

function makeMockWeave() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    zMoveNode: vi.fn(),
    _logger: logger,
  };
}

function makeInstance(id: string, nodeType: string, zIndexVal = 0) {
  return {
    getAttrs: vi.fn().mockReturnValue({ id, nodeType }),
    zIndex: vi.fn().mockReturnValue(zIndexVal),
  } as unknown as WeaveElementInstance;
}

function makeHandler(serialized: object = { key: 'node1' }) {
  return { serialize: vi.fn().mockReturnValue(serialized) };
}

describe('WeaveZIndexManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveZIndexManager;

  beforeEach(() => {
    mockWeave = makeMockWeave();
    manager = new WeaveZIndexManager(mockWeave as unknown as Weave);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "zindex-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('zindex-manager');
    });

    it('logs debug "zIndex manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('zIndex manager created');
    });
  });

  // ─── Suite 2: getSelectionPlugin ─────────────────────────────────────────

  describe('getSelectionPlugin', () => {
    it('returns the nodesSelection plugin when found', () => {
      const plugin = { name: 'nodesSelection' };
      mockWeave.getPlugin.mockReturnValue(plugin);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).getSelectionPlugin()).toBe(plugin);
      expect(mockWeave.getPlugin).toHaveBeenCalledWith('nodesSelection');
    });

    it('returns undefined when plugin is not registered', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((manager as any).getSelectionPlugin()).toBeUndefined();
    });
  });

  // ─── Suite 3: moveUp ─────────────────────────────────────────────────────

  describe('moveUp', () => {
    it('logs debug with the instance id', () => {
      const instance = makeInstance('rect1', 'rect');
      manager.moveUp(instance);
      expect(mockWeave._logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('rect1')
      );
    });

    it('serializes and calls zMoveNode with UP when handler exists', () => {
      const nodeState = { key: 'rect1', type: 'rect', props: {} };
      const handler = makeHandler(nodeState);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const instance = makeInstance('rect1', 'rect');

      manager.moveUp(instance);

      expect(handler.serialize).toHaveBeenCalledWith(instance);
      expect(mockWeave.zMoveNode).toHaveBeenCalledWith(nodeState, WEAVE_NODE_POSITION.UP);
    });

    it('does not call zMoveNode when handler is undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      manager.moveUp(makeInstance('rect1', 'rect'));
      expect(mockWeave.zMoveNode).not.toHaveBeenCalled();
    });
  });

  // ─── Suite 4: moveDown ───────────────────────────────────────────────────

  describe('moveDown', () => {
    it('logs debug with the instance id', () => {
      const instance = makeInstance('rect2', 'rect');
      manager.moveDown(instance);
      expect(mockWeave._logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('rect2')
      );
    });

    it('serializes and calls zMoveNode with DOWN when handler exists', () => {
      const nodeState = { key: 'rect2', type: 'rect', props: {} };
      const handler = makeHandler(nodeState);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const instance = makeInstance('rect2', 'rect');

      manager.moveDown(instance);

      expect(handler.serialize).toHaveBeenCalledWith(instance);
      expect(mockWeave.zMoveNode).toHaveBeenCalledWith(nodeState, WEAVE_NODE_POSITION.DOWN);
    });

    it('does not call zMoveNode when handler is undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      manager.moveDown(makeInstance('rect2', 'rect'));
      expect(mockWeave.zMoveNode).not.toHaveBeenCalled();
    });
  });

  // ─── Suite 5: sendToBack ─────────────────────────────────────────────────

  describe('sendToBack', () => {
    it('wraps a single instance in an array and calls zMoveNode with BACK', () => {
      const nodeState = { key: 'n1' };
      const handler = makeHandler(nodeState);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const instance = makeInstance('n1', 'rect', 0);

      manager.sendToBack(instance);

      expect(mockWeave.zMoveNode).toHaveBeenCalledWith(nodeState, WEAVE_NODE_POSITION.BACK);
    });

    it('processes all instances in an array', () => {
      const handler = makeHandler({});
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const instances = [
        makeInstance('n1', 'rect', 1),
        makeInstance('n2', 'rect', 2),
      ];

      manager.sendToBack(instances);

      expect(mockWeave.zMoveNode).toHaveBeenCalledTimes(2);
    });

    it('processes nodes in descending zIndex order', () => {
      const order: number[] = [];
      const handler = {
        serialize: vi.fn((node: WeaveElementInstance) => {
          order.push(node.zIndex());
          return {};
        }),
      };
      mockWeave.getNodeHandler.mockReturnValue(handler);

      manager.sendToBack([
        makeInstance('n1', 'rect', 1),
        makeInstance('n2', 'rect', 3),
        makeInstance('n3', 'rect', 2),
      ]);

      expect(order).toEqual([3, 2, 1]); // highest zIndex processed first
    });

    it('skips node when handler is undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      manager.sendToBack([makeInstance('n1', 'rect', 0)]);
      expect(mockWeave.zMoveNode).not.toHaveBeenCalled();
    });
  });

  // ─── Suite 6: bringToFront ───────────────────────────────────────────────

  describe('bringToFront', () => {
    it('wraps a single instance in an array and calls zMoveNode with FRONT', () => {
      const nodeState = { key: 'n1' };
      const handler = makeHandler(nodeState);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const instance = makeInstance('n1', 'rect', 0);

      manager.bringToFront(instance);

      expect(mockWeave.zMoveNode).toHaveBeenCalledWith(nodeState, WEAVE_NODE_POSITION.FRONT);
    });

    it('processes all instances in an array', () => {
      const handler = makeHandler({});
      mockWeave.getNodeHandler.mockReturnValue(handler);

      manager.bringToFront([
        makeInstance('n1', 'rect', 1),
        makeInstance('n2', 'rect', 2),
      ]);

      expect(mockWeave.zMoveNode).toHaveBeenCalledTimes(2);
    });

    it('processes nodes in ascending zIndex order', () => {
      const order: number[] = [];
      const handler = {
        serialize: vi.fn((node: WeaveElementInstance) => {
          order.push(node.zIndex());
          return {};
        }),
      };
      mockWeave.getNodeHandler.mockReturnValue(handler);

      manager.bringToFront([
        makeInstance('n1', 'rect', 3),
        makeInstance('n2', 'rect', 1),
        makeInstance('n3', 'rect', 2),
      ]);

      expect(order).toEqual([1, 2, 3]); // lowest zIndex processed first
    });

    it('skips node when handler is undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      manager.bringToFront([makeInstance('n1', 'rect', 0)]);
      expect(mockWeave.zMoveNode).not.toHaveBeenCalled();
    });
  });
});
