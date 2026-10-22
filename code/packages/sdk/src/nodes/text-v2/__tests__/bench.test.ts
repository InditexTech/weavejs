// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Shape } from '../shape';
import { replaceRange, synthesizeBlocks } from '../model';

const cfg = { fontSize: 16, fontFamily: 'sans-serif', width: 400 };
const words =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split(
    ' '
  );
const para = (n: number) => {
  let s = '';
  let i = 0;
  while (s.length < n) s += words[i++ % words.length] + ' ';
  return s.trim();
};
const time = (fn: () => void) => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};
const out = (o: Record<string, unknown>) =>
  process.stdout.write(`BENCH ${JSON.stringify(o)}\n`);

// Opt-in: `WEAVE_BENCH=1 npx vitest run src/nodes/text-v2/__tests__/bench.test.ts`
describe.skipIf(!process.env.WEAVE_BENCH)(
  'benchmarks vs Konva.Text (informational, loose regression guards)',
  () => {
    it.each([1_000, 10_000, 100_000])(
      'layout of %i chars (single paragraph + many paragraphs)',
      { timeout: 120000 },
      (n) => {
        const single = para(n);
        const many = Array.from({ length: n / 50 }, (_, i) =>
          para(50 + (i % 7))
        ).join('\n');
        const row: Record<string, unknown> = { chars: n };
        for (const [name, text] of [
          ['single', single],
          ['paragraphs', many],
        ] as const) {
          let v2!: WeaveTextV2Shape;
          let k!: Konva.Text;
          row[`${name}_v2_ms`] = +time(() => {
            v2 = new WeaveTextV2Shape({ text, ...cfg });
            v2.ensureLayout();
          }).toFixed(1);
          // Konva's wrap is O(n^2) on one huge paragraph: minutes at 100k chars.
          const skipKonva = name === 'single' && n > 20_000;
          row[`${name}_konva_ms`] = skipKonva
            ? 'skipped (minutes)'
            : +time(() => {
                k = new Konva.Text({ text, ...cfg });
              }).toFixed(1);
          // v2 cached relayout after edit (incremental)
          const b = v2.getBlocks();
          const edited = replaceRange(
            b,
            Math.floor(text.length / 2),
            Math.floor(text.length / 2),
            'x'
          );
          row[`${name}_v2_edit_ms`] = +time(() => {
            v2.setBlocks(edited);
            v2.ensureLayout();
          }).toFixed(1);
          row[`${name}_konva_edit_ms`] = skipKonva
            ? 'skipped'
            : +time(() =>
                k.text(
                  text.slice(0, text.length / 2) +
                    'x' +
                    text.slice(text.length / 2)
                )
              ).toFixed(1);
        }
        out(row);
        expect(row.paragraphs_v2_edit_ms as number).toBeLessThan(500);
      }
    );

    it('typing latency in a 100k-char, 2000-paragraph doc', () => {
      const text = Array.from({ length: 2000 }, (_, i) =>
        para(50 + (i % 7))
      ).join('\n');
      const v2 = new WeaveTextV2Shape({ text, ...cfg });
      v2.ensureLayout();
      let blocks = v2.getBlocks();
      const samples: number[] = [];
      let pos = Math.floor(text.length / 2);
      for (let i = 0; i < 40; i++) {
        samples.push(
          time(() => {
            blocks = replaceRange(blocks, pos, pos, 'a');
            pos++;
            v2.setBlocks(blocks);
            v2.ensureLayout();
          })
        );
      }
      samples.sort((a, b) => a - b);
      out({
        typing_100k_p50_ms: +samples[20].toFixed(2),
        p95: +samples[38].toFixed(2),
        max: +samples[39].toFixed(2),
      });
      expect(samples[20]).toBeLessThan(50);
    });

    it('5k-node load', { timeout: 120000 }, () => {
      const texts = Array.from(
        { length: 5000 },
        (_, i) => `Node ${i}: ${para(60 + (i % 40))}`
      );
      const stage = new Konva.Stage({
        container: document.createElement('div'),
        width: 800,
        height: 600,
      });
      const layer = new Konva.Layer();
      stage.add(layer);
      const v2 = time(() => {
        texts.forEach((t, i) =>
          layer.add(
            new WeaveTextV2Shape({
              text: t,
              ...cfg,
              width: 200,
              x: (i % 50) * 20,
              y: Math.floor(i / 50) * 20,
            })
          )
        );
        layer.draw();
      });
      layer.destroyChildren();
      const konva = time(() => {
        texts.forEach((t, i) =>
          layer.add(
            new Konva.Text({
              text: t,
              ...cfg,
              width: 200,
              x: (i % 50) * 20,
              y: Math.floor(i / 50) * 20,
            })
          )
        );
        layer.draw();
      });
      out({ load5k_v2_ms: +v2.toFixed(0), load5k_konva_ms: +konva.toFixed(0) });
      expect(v2).toBeLessThan(konva * 5 + 2000);
    });

    it('synthesizeBlocks cost for 100k chars', () => {
      const text = Array.from({ length: 2000 }, (_, i) =>
        para(50 + (i % 7))
      ).join('\n');
      out({ synth_100k_ms: +time(() => synthesizeBlocks(text)).toFixed(2) });
    });
  }
);
