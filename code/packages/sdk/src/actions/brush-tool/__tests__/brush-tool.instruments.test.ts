// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveBrushToolAction } from '../brush-tool';
import { BRUSH_LEGACY_INPUT_PROFILE } from '../constants';
import type { WeaveBrushInstrumentId } from '../tunables/presets';
import { type Gesture, type GestureStep, runGesture } from './shared/brush-golden.helpers';

type Props = { opacity?: number; globalCompositeOperation?: string };
const propsOf = (a: WeaveBrushToolAction) =>
  (a as unknown as { props: Props }).props;

const unknownId = 'laserPointer' as WeaveBrushInstrumentId;

describe('brush instruments', () => {
  it('change nothing until one is selected', () => {
    const action = new WeaveBrushToolAction();
    expect(action.getInstrument()).toBeNull();
    expect(action.getLook()).toBeNull();
    expect(propsOf(action)).toEqual({
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
    });
    for (const key of ['mouse', 'touch', 'pen.applePencil', 'pen.desktop'] as const) {
      expect(action.getInputProfile(key)).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    }
  });

  it('lists the instruments it offers', () => {
    expect(new WeaveBrushToolAction().getInstruments()).toEqual(
      expect.arrayContaining([
        'pencil',
        'pen',
        'brush',
        'fountainPen',
        'fineliner',
        'marker',
        'highlighter',
      ])
    );
  });

  it('selects the highlighter: flat ends, constant width, translucent, multiply', () => {
    const action = new WeaveBrushToolAction();
    expect(action.setInstrument('highlighter')).toEqual({
      applied: true,
      errors: [],
    });
    const look = action.getLook()!;
    expect(look.ends).toBe('flat');
    expect(look.width.min).toBe(look.width.max);
    expect(propsOf(action).opacity).toBe(0.75);
    expect(propsOf(action).globalCompositeOperation).toBe('multiply');
  });

  it('selects the fineliner with round ends and the marker with flat ends', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('fineliner');
    expect(action.getLook()!.ends).toBe('round');
    expect(action.getLook()!.width.min).toBe(action.getLook()!.width.max);
    action.setInstrument('marker');
    expect(action.getLook()!.ends).toBe('flat');
    expect(action.getLook()!.width.min).toBeCloseTo(0.88);
  });

  it('does not depend on the instrument selected before', () => {
    const a = new WeaveBrushToolAction();
    a.setInstrument('highlighter');
    a.setInstrument('marker');
    const b = new WeaveBrushToolAction();
    b.setInstrument('marker');
    expect(a.getLook()).toEqual(b.getLook());
    expect(propsOf(a)).toEqual(propsOf(b));
    expect(propsOf(a).opacity).toBe(1);
    expect(propsOf(a).globalCompositeOperation).toBe('source-over');
  });

  it('rejects an unknown id and changes nothing', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('marker');
    const look = action.getLook();
    const result = action.setInstrument(unknownId);
    expect(result.applied).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(action.getInstrument()).toBe('marker');
    expect(action.getLook()).toEqual(look);
  });

  it('leaves the stroke in progress with the settings it started with', () => {
    const action = new WeaveBrushToolAction();
    const before = action.getInputProfile('mouse');
    const started = (action as unknown as { activeProfile: unknown })
      .activeProfile;
    action.setInstrument('highlighter');
    expect((action as unknown as { activeProfile: unknown }).activeProfile).toBe(
      started
    );
    expect(started).toEqual(before);
  });

  describe('selection', () => {
    it('is reported by getInstrument', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      expect(action.getInstrument()).toBe('marker');
    });

    it('becomes custom when the look is changed on its own', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      action.setLook({ spacingPx: 3 });
      expect(action.getInstrument()).toBe('custom');
    });

    it('becomes custom when a profile is changed on its own', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      action.setInputProfile('mouse', { capture: { minMovePx: 1 } });
      expect(action.getInstrument()).toBe('custom');
    });

    it('stays custom after another change', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      action.setLook({ spacingPx: 3 });
      action.setLook({ spacingPx: 4 });
      expect(action.getInstrument()).toBe('custom');
    });

    it('is not selected by a change made when none was', () => {
      const action = new WeaveBrushToolAction();
      action.setLook({ spacingPx: 3 });
      action.setInputProfile('mouse', { capture: { minMovePx: 1 } });
      expect(action.getInstrument()).toBeNull();
    });

    it('is cleared by clearing the look', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      action.setLook(null);
      expect(action.getInstrument()).toBeNull();
    });

    it('is cleared by applying a scenario', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      expect(action.applyScenario('A').applied).toBe(true);
      expect(action.getInstrument()).toBeNull();
    });

    it('is not changed by a rejected change', () => {
      const action = new WeaveBrushToolAction();
      action.setInstrument('marker');
      expect(action.setLook({ spacingPx: 99 }).applied).toBe(false);
      expect(action.getInstrument()).toBe('marker');
    });
  });
});

describe('brush instruments in the configuration document', () => {
  it('leaves the field out when none is selected', () => {
    const doc = new WeaveBrushToolAction().exportConfig();
    expect(doc).not.toHaveProperty('instrument');
    expect(doc.version).toBe(1);
  });

  it('round-trips the selected instrument with its opacity and blend mode', () => {
    const source = new WeaveBrushToolAction();
    source.setInstrument('highlighter');
    const doc = source.exportConfig();
    expect(doc.instrument).toBe('highlighter');
    expect(doc.version).toBe(1);

    const target = new WeaveBrushToolAction();
    expect(target.importConfig(doc)).toEqual({ applied: true, errors: [] });
    expect(target.getInstrument()).toBe('highlighter');
    expect(target.getLook()).toEqual(source.getLook());
    expect(propsOf(target).opacity).toBe(0.75);
    expect(propsOf(target).globalCompositeOperation).toBe('multiply');
    expect(target.exportConfig()).toEqual(doc);
  });

  it('round-trips a customised instrument', () => {
    const source = new WeaveBrushToolAction();
    source.setInstrument('marker');
    source.setLook({ spacingPx: 3 });
    const target = new WeaveBrushToolAction();
    target.importConfig(source.exportConfigJson());
    expect(target.getInstrument()).toBe('custom');
  });

  it('accepts a document made before instruments and selects none', () => {
    const doc = new WeaveBrushToolAction().exportConfig();
    const target = new WeaveBrushToolAction();
    target.setInstrument('marker');
    expect(target.importConfig(doc).applied).toBe(true);
    expect(target.getInstrument()).toBeNull();
  });

  it('rejects an unknown instrument as a whole', () => {
    const target = new WeaveBrushToolAction();
    target.setInstrument('marker');
    const before = target.exportConfig();
    const result = target.importConfig({ ...before, instrument: 'laserPointer' });
    expect(result.applied).toBe(false);
    expect(result.errors[0]).toMatch(/Unknown instrument/);
    expect(target.exportConfig()).toEqual(before);
  });
});

describe('pencil and pen instruments', () => {
  const line = (step: number, pointerType: string, pressure = 0.7): Gesture => {
    const steps: GestureStep[] = [
      { type: 'down', t: 0, x: 10, y: 10, pressure, pointerType },
    ];
    for (let i = 1; i <= 8; i++) {
      steps.push({ type: 'move', t: i * 10, x: 10 + i * step, y: 10, pressure, pointerType });
    }
    steps.push({ type: 'up', t: 90 });
    return { name: 'line', steps };
  };

  const draw = (g: Gesture, instrument?: WeaveBrushInstrumentId) =>
    runGesture(g, undefined, (action, i) => {
      if (i === 0 && instrument) action.setInstrument(instrument);
    }).live.map((p) => p.pressure);

  it.each(['pencil', 'pen'] as const)('%s selects and is readable', (id) => {
    const action = new WeaveBrushToolAction();
    expect(action.setInstrument(id)).toEqual({ applied: true, errors: [] });
    expect(action.getInstrument()).toBe(id);
    expect(action.getLook()!.outline).toBe('round');
  });

  it.each(['pencil', 'pen', 'brush', 'fountainPen', 'marker'] as const)(
    '%s gives a mouse a width that follows the speed',
    (id) => {
      const slow = draw(line(2, 'mouse'), id);
      const fast = draw(line(40, 'mouse'), id);
      expect(Math.min(...slow.slice(2))).toBeGreaterThan(Math.max(...fast.slice(2)));
    }
  );

  it.each(['pencil', 'pen'] as const)(
    '%s leaves the pressure of a pen as the pen reports it',
    (id) => {
      const g = line(40, 'pen', 0.7);
      expect(draw(g, id)).toEqual(draw(g));
    }
  );

  it.each(['pencil', 'pen'] as const)(
    '%s sets the speed-based pressure on the mouse and touch profiles only',
    (id) => {
      const action = new WeaveBrushToolAction();
      action.setInstrument(id);
      expect(action.getInputProfile('mouse').pressure.synth).toBe('velocity');
      expect(action.getInputProfile('touch').pressure.synth).toBe('velocity');
      expect(action.getInputProfile('pen.desktop')).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
      expect(action.getInputProfile('pen.applePencil')).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
    }
  );

  it('finishes with the pressure-aware and the curve-fitting modes', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('pencil');
    expect(action.getInputProfile('mouse').finalize.mode).toBe('dpPressure');
    action.setInstrument('pen');
    expect(action.getInputProfile('mouse').finalize.mode).toBe('bezierFit');
  });

  it('is replaced completely by the next instrument', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('pen');
    action.setInstrument('fineliner');
    expect(action.getInputProfile('mouse')).toEqual({
      ...BRUSH_LEGACY_INPUT_PROFILE,
      capture: { ...BRUSH_LEGACY_INPUT_PROFILE.capture, shiftLock: true },
    });
    expect(action.getInputProfile('touch')).toEqual(BRUSH_LEGACY_INPUT_PROFILE);
  });
});

describe('brush instrument', () => {
  const brushAt = (strokeWidth?: number) => {
    const action = new WeaveBrushToolAction();
    if (strokeWidth !== undefined) action.updateProps({ strokeWidth });
    expect(action.setInstrument('brush').applied).toBe(true);
    return action;
  };

  it('tapers both ends and varies the width', () => {
    const look = brushAt().getLook()!;
    expect(look.width.taperStart).toBeGreaterThan(0);
    expect(look.width.taperEnd).toBeGreaterThan(look.width.taperStart);
    expect(look.variance).toBeGreaterThan(0);
    expect(look.width.min).toBeLessThan(look.width.max);
    expect(look.ends).toBe('round');
  });

  it('scales its tapers to the stroke width', () => {
    const thin = brushAt(2).getLook()!.width;
    const thick = brushAt(20).getLook()!.width;
    expect(thick.taperEnd!).toBeGreaterThan(thin.taperEnd!);
    expect(thick.taperStart!).toBeGreaterThan(thin.taperStart!);
  });

  it('keeps its tapers inside what a look accepts at any width', () => {
    for (const w of [0.1, 1, 500, 5000]) {
      const { taperStart, taperEnd } = brushAt(w).getLook()!.width;
      expect(taperStart).toBeGreaterThanOrEqual(2);
      expect(taperEnd).toBeLessThanOrEqual(200);
    }
  });

  it('is fitted to a curve and follows the speed of a mouse', () => {
    const action = brushAt();
    expect(action.getInputProfile('mouse').finalize.mode).toBe('bezierFit');
    expect(action.getInputProfile('mouse').pressure.synth).toBe('velocity');
  });

  it('the marker thins at speed and is finished with dpPressure', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('marker');
    expect(action.getInputProfile('mouse').pressure.synth).toBe('velocity');
    expect(action.getInputProfile('mouse').finalize.mode).toBe('dpPressure');
    expect(action.getLook()!.width.min).toBeCloseTo(0.88);
    expect(action.getLook()!.width.max).toBe(1);
  });
});

describe('fountain pen instrument', () => {
  it('has a nib: a contrast and an angle', () => {
    const action = new WeaveBrushToolAction();
    expect(action.setInstrument('fountainPen')).toEqual({ applied: true, errors: [] });
    const { width } = action.getLook()!;
    expect(width.nibContrast).toBeGreaterThan(0);
    expect(width.nibAngle).toBeDefined();
    expect(action.getInstrument()).toBe('fountainPen');
  });

  it('follows the speed of a mouse and is fitted to a curve', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('fountainPen');
    expect(action.getInputProfile('mouse').pressure.synth).toBe('velocity');
    expect(action.getInputProfile('mouse').finalize.mode).toBe('bezierFit');
  });

  it('keeps the nib of another look from carrying over', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('fountainPen');
    action.setInstrument('pen');
    expect(action.getLook()!.width.nibContrast).toBeUndefined();
  });
});

describe('instruments and the Shift lock', () => {
  it.each([
    'pencil',
    'pen',
    'brush',
    'fountainPen',
    'fineliner',
    'marker',
    'highlighter',
  ] as const)('%s turns the lock on for the mouse only', (id) => {
    const action = new WeaveBrushToolAction();
    expect(action.getInputProfile('mouse').capture.shiftLock).toBeUndefined();
    action.setInstrument(id);
    expect(action.getInputProfile('mouse').capture.shiftLock).toBe(true);
    expect(action.getInputProfile('touch').capture.shiftLock).toBeUndefined();
    expect(action.getInputProfile('pen.desktop').capture.shiftLock).toBeUndefined();
  });

  it('is off again when the lock-free scenario is applied', () => {
    const action = new WeaveBrushToolAction();
    action.setInstrument('pen');
    action.applyScenario('A');
    expect(action.getInputProfile('mouse').capture.shiftLock).toBeUndefined();
  });
});
